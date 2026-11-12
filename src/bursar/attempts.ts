import { sha256 } from "../paypal/types";

/**
 * The attempt log. A row is written before every PayPal call and its result after.
 * On restart, an attempt with a result is replayed from the log; an attempt without a result is
 * resent with the same PayPal-Request-Id (PayPal returns the original outcome instead of acting
 * twice); an attempt whose payload differs from the logged one is refused and held for the teacher.
 */
export type Attempt = {
  id: string;
  poolId: string;
  memberId: string | null;
  op: string;
  requestId: string;
  payloadHash: string;
  startedAt: string;
  result?: { ok: true; value: unknown } | { ok: false; error: string };
  finishedAt?: string;
};

export interface AttemptStore {
  get(requestId: string): Promise<Attempt | undefined>;
  start(a: Attempt): Promise<void>;
  finish(requestId: string, result: NonNullable<Attempt["result"]>): Promise<void>;
  list(poolId: string): Promise<Attempt[]>;
}

export class MemoryAttempts implements AttemptStore {
  rows = new Map<string, Attempt>();
  async get(r: string) { return this.rows.get(r); }
  async start(a: Attempt) { this.rows.set(a.requestId, a); }
  async finish(r: string, result: NonNullable<Attempt["result"]>) {
    const a = this.rows.get(r);
    if (a) { a.result = result; a.finishedAt = new Date().toISOString(); }
  }
  async list(poolId: string) { return [...this.rows.values()].filter((a) => a.poolId === poolId); }
}

export class HeldForTeacher extends Error {
  constructor(public requestId: string) { super(`HELD_FOR_TEACHER payload differs from logged attempt ${requestId}`); }
}

/** Run one PayPal call under the attempt log. */
export async function attempt<T>(
  store: AttemptStore,
  meta: { poolId: string; memberId: string | null; op: string; requestId: string; payload: unknown },
  call: () => Promise<T>,
): Promise<T> {
  const payloadHash = sha256(JSON.stringify(meta.payload));
  const prior = await store.get(meta.requestId);
  if (prior) {
    if (prior.payloadHash !== payloadHash) throw new HeldForTeacher(meta.requestId);
    if (prior.result?.ok) return prior.result.value as T;
    if (prior.result && !prior.result.ok) throw new Error(prior.result.error);
    // No result: the process died mid-call. Resend with the same request id.
  } else {
    await store.start({ id: meta.requestId, poolId: meta.poolId, memberId: meta.memberId, op: meta.op, requestId: meta.requestId, payloadHash, startedAt: new Date().toISOString() });
  }
  try {
    const value = await call();
    await store.finish(meta.requestId, { ok: true, value: value ?? null });
    return value;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.startsWith("CRASH")) await store.finish(meta.requestId, { ok: false, error: msg });
    throw e;
  }
}
