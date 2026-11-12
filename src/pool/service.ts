import { randomBytes, randomUUID } from "node:crypto";
import { db, LedgerAttempts, type Store } from "../db/store";
import { hashFor, runClose, poolFixed, poolPerHead, type CloseResult, type PoolTerms, type Vendor } from "../bursar/close";
import { allocate, worstCaseShare, type Member } from "../bursar/allocate";
import { planRenewal } from "../bursar/renewal";
import { StandInPayPal } from "../paypal/standin";
import { LivePayPal, hasPayPalKeys } from "../paypal/live";
import { requestId, type PayPalPort } from "../paypal/types";
import { ensureSeeded } from "./seed";

export type Lang = "en" | "es" | "vi";
export type PoolState = "OPEN" | "HOLDING" | "QUORATE" | "CLOSING" | "CLOSED" | "NEEDS_TEACHER" | "LAPSED" | "FAILED";
export type HoldSource = "paypal-login" | "saved-wallet" | "sandbox-card" | "stand-in";

export type Pool = PoolTerms & {
  title: string; school: string; teacher: string; template: "class-trip" | "team-bus";
  closeAt: string; state: PoolState; createdAt: string; kind: "class" | "live-run";
  port: PayPalPort["kind"]; holdSource: HoldSource; note?: string; decline?: string;
};
export type PoolMember = {
  id: string; poolId: string; child: string; family: string; lang: Lang; role: Member["role"]; seq: number;
  capCents: number; token: string; state: "INVITED" | "HELD" | "SETTLED" | "RELEASED" | "DECLINED" | "REVIEW" | "CAPTURED_PART";
  orderId?: string; authId?: string; authorizedAt?: string; honorUntil?: string; validUntil?: string; renewAt?: string | null;
  approvedHash?: string; source?: HoldSource; debugId?: string;
};

const CHILDREN: [string, string, Lang][] = [
  ["Maya R.", "Rojas family", "es"], ["Liam T.", "Tran family", "vi"], ["Ava P.", "Patel family", "en"], ["Noah K.", "Kim family", "en"],
  ["Sofia G.", "Garcia family", "es"], ["Ethan N.", "Nguyen family", "vi"], ["Zoe B.", "Brown family", "en"], ["Lucas M.", "Martinez family", "es"],
  ["Mia W.", "Williams family", "en"], ["Daniel L.", "Le family", "vi"], ["Isabella H.", "Hernandez family", "es"], ["James O.", "Okafor family", "en"],
  ["Chloe D.", "Davis family", "en"], ["Mateo S.", "Sanchez family", "es"], ["Emma P.", "Pham family", "vi"], ["Leo J.", "Johnson family", "en"],
  ["Aria C.", "Cruz family", "es"], ["Henry W.", "Wong family", "en"], ["Lily V.", "Vo family", "vi"], ["Jack A.", "Ahmed family", "en"],
  ["Grace F.", "Flores family", "es"], ["Owen M.", "Miller family", "en"], ["Nora H.", "Hoang family", "vi"], ["Elijah R.", "Ramirez family", "es"],
  ["Ruby C.", "Chen family", "en"], ["Sam T.", "Torres family", "es"],
];

export function vendors(): Vendor[] {
  return [
    { name: "Bayline Coaches (demo)", receiver: process.env.VENDOR_COACH_EMAIL || "coach@example.test", fixedCents: 144_000, perHeadCents: 0 },
    { name: "Harbor Science Museum (demo)", receiver: process.env.VENDOR_MUSEUM_EMAIL || "museum@example.test", fixedCents: 0, perHeadCents: 800 },
  ];
}

const token = () => randomBytes(12).toString("base64url");

export function makePool(kind: Pool["kind"], title: string, n: number, port: Pool["port"], holdSource: HoldSource): { pool: Pool; members: PoolMember[] } {
  const now = Date.now();
  const id = `${kind === "class" ? "class" : "run"}-${new Date(now).toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex")}`;
  const pool: Pool = {
    id, title, school: "Harbor View Elementary (demo)", teacher: "Ms. Rivera (demo)", template: "class-trip", minN: 18,
    deadline: new Date(now + 20 * 3600_000).toISOString(), closeAt: new Date(now + 20 * 3600_000).toISOString(),
    vendors: vendors(), state: "OPEN", createdAt: new Date(now).toISOString(), kind, port, holdSource,
  };
  const cap = worstCaseShare(poolFixed(pool), poolPerHead(pool), pool.minN);
  const members = CHILDREN.slice(0, n).map(([child, family, lang], i): PoolMember => ({
    id: `m${String(i + 1).padStart(2, "0")}`, poolId: id, child, family, lang, role: "child", seq: i, capCents: cap, token: token(), state: "INVITED",
  }));
  return { pool, members };
}

export async function savePool(s: Store, pool: Pool, members: PoolMember[]) {
  await s.put("pool", pool.id, pool.id, pool);
  for (const m of members) { await s.put("member", `${pool.id}:${m.id}`, pool.id, m); await s.put("token", m.token, pool.id, { poolId: pool.id, memberId: m.id }); }
}

export async function getPool(id: string, s = db()) {
  await ensureSeeded(s);
  const pool = await s.get<Pool>("pool", id);
  if (!pool) return null;
  const members = (await s.list<PoolMember>("member", id)).sort((a, b) => a.seq - b.seq);
  const close = await s.get<CloseResult & { startedAt: string; finishedAt?: string }>("close", id);
  const attempts = await new LedgerAttempts(s).list(id);
  const held = members.filter((m) => m.state !== "INVITED" && m.state !== "DECLINED" && m.state !== "RELEASED");
  const plan = allocate(poolFixed(pool), poolPerHead(pool), held.map((m) => ({ id: m.id, role: m.role, seq: m.seq, capCents: m.capCents })));
  return { pool, members, close, attempts, preview: plan, heldCount: held.length };
}

export async function listPools(kind?: Pool["kind"], s = db()) {
  await ensureSeeded(s);
  const all = await s.list<Pool>("pool");
  return all.filter((p) => !kind || p.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The class pool families approve on PayPal. Created once. */
export async function classPool(s = db()) {
  const pools = await listPools("class", s);
  if (pools[0]) return pools[0];
  const { pool, members } = makePool("class", "Grade 4 trip to the science museum", 26, hasPayPalKeys() ? "sandbox" : "stand-in", "paypal-login");
  await savePool(s, pool, members);
  return pool;
}

export async function memberByToken(t: string, s = db()) {
  const ref = await s.get<{ poolId: string; memberId: string }>("token", t);
  if (!ref) return null;
  const pool = await s.get<Pool>("pool", ref.poolId);
  const member = await s.get<PoolMember>("member", `${ref.poolId}:${ref.memberId}`);
  return pool && member ? { pool, member } : null;
}

export async function recordHold(s: Store, pool: Pool, m: PoolMember, h: { orderId: string; authId: string; authorizedAt?: string; source: HoldSource; debugId?: string }) {
  const at = h.authorizedAt ? Date.parse(h.authorizedAt) : Date.now();
  const r = planRenewal(at, Date.parse(pool.closeAt));
  const next: PoolMember = { ...m, state: "HELD", orderId: h.orderId, authId: h.authId, authorizedAt: new Date(at).toISOString(),
    honorUntil: new Date(r.honorUntil).toISOString(), validUntil: new Date(r.validUntil).toISOString(),
    renewAt: r.kind === "SCHEDULED" ? new Date(r.renewAt).toISOString() : null, approvedHash: hashFor(pool, m.capCents), source: h.source, debugId: h.debugId };
  await s.put("member", `${pool.id}:${m.id}`, pool.id, next);
  return next;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * The judge's live run: 20 families hold $88.00 each on the PayPal sandbox, then the close runs
 * with PayPal itself declining family 7's capture (sandbox negative testing) when asked.
 */
export async function startLiveRun(opts: { decline: boolean; n?: number; wait?: boolean }, s = db()) {
  if (process.env.QUORATE_LIVE === "off") throw new Error("LIVE_OFF");
  const runs = (await listPools("live-run", s)).filter((p) => p.createdAt.startsWith(today()));
  const max = Number(process.env.LIVE_MAX_CLOSES_PER_DAY ?? 20);
  if (runs.length >= max) throw new Error(`DAILY_LIMIT ${max}`);
  const n = Math.min(Math.max(opts.n ?? 20, 18), 26);
  const live = hasPayPalKeys();
  const { pool, members } = makePool("live-run", `Live run, ${n} families${opts.decline ? ", PayPal declines family 7" : ""}`, n, live ? "sandbox" : "stand-in", live ? (process.env.PAYPAL_VAULT_ID ? "saved-wallet" : "sandbox-card") : "stand-in");
  pool.state = "HOLDING";
  if (opts.decline) pool.decline = "m07";
  await savePool(s, pool, members);
  const done = runInBackground(pool, members, opts.decline, s);
  if (opts.wait) await done;
  return pool;
}

async function runInBackground(pool: Pool, members: PoolMember[], decline: boolean, s: Store) {
  let port: PayPalPort;
  const standin = new StandInPayPal();
  try {
    if (pool.port === "sandbox") {
      const { createCardHold } = await import("../paypal/cardhold");
      port = new LivePayPal();
      try {
        // Holds in small parallel batches.
        for (let i = 0; i < members.length; i += 5) {
          await Promise.all(members.slice(i, i + 5).map(async (m, j) => {
            const h = await createCardHold({ memberId: m.id, poolId: pool.id, capCents: m.capCents, termsHash: hashFor(pool, m.capCents), requestId: requestId(pool.id, m.id, "hold") });
            members[i + j] = await recordHold(s, pool, m, { orderId: h.orderId, authId: h.authId, authorizedAt: new Date().toISOString(), source: pool.holdSource, debugId: h.debugId });
          }));
        }
      } catch (e) {
        if (!String((e as Error).message).includes("CARD_PROCESSING")) throw e;
        pool.port = "stand-in"; pool.holdSource = "stand-in";
        pool.note = "This sandbox account is not enabled for card holds, so this run used the PayPal stand-in.";
        port = standin;
      }
    } else port = standin;
    if (port === standin) {
      for (let i = 0; i < members.length; i++) members[i] = await recordHold(s, pool, members[i], { orderId: `STANDIN-${i}`, authId: standin.authorize(members[i].capCents), source: "stand-in" });
    }
    pool.state = "CLOSING";
    await s.put("pool", pool.id, pool.id, pool);
    const startedAt = new Date().toISOString();
    const closeMembers = members.map((m) => ({ id: m.id, label: m.child, role: m.role, seq: m.seq, capCents: m.capCents, authId: m.authId!, approvedHash: m.approvedHash! }));
    let saving = Promise.resolve();
    const result = await runClose({
      pool, members: closeMembers, port, store: new LedgerAttempts(s), closeAttempt: 1,
      faults: decline ? { m07: "PAYER_CANNOT_PAY" } : undefined,
      onStep: (_step, all) => { saving = saving.then(() => s.put("close", pool.id, pool.id, { state: "CLOSING", steps: [...all], startedAt })); },
    });
    await saving;
    await s.put("close", pool.id, pool.id, { ...result, startedAt, finishedAt: new Date().toISOString() });
    for (const o of result.members) {
      const m = members.find((x) => x.id === o.id)!;
      await s.put("member", `${pool.id}:${m.id}`, pool.id, { ...m, state: o.status === "EXPIRED" ? "RELEASED" : o.status });
    }
    pool.state = result.state;
    await s.put("pool", pool.id, pool.id, pool);
    await s.put("run", pool.id, pool.id, { poolId: pool.id, at: startedAt, port: result.port, holdSource: pool.holdSource, state: result.state, decline: Boolean(decline), reconciled: result.reconciled, payout: result.payout, n: members.length });
  } catch (e) {
    pool.state = "FAILED"; pool.note = (e as Error).message.slice(0, 300);
    await s.put("pool", pool.id, pool.id, pool);
  }
}

export const newRequestId = () => randomUUID();
