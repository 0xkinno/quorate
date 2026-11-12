import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Attempt, AttemptStore } from "../bursar/attempts";

/**
 * Durable ledger. Postgres on Render (DATABASE_URL); a local JSON file otherwise, so a clean clone
 * runs with no keys. State never lives only in process memory: a restart keeps the proof.
 */
export type Row = { kind: string; id: string; poolId: string | null; json: unknown; updatedAt: string };

export interface Store {
  readonly kind: "postgres" | "file";
  get<T>(kind: string, id: string): Promise<T | undefined>;
  put(kind: string, id: string, poolId: string | null, json: unknown): Promise<void>;
  list<T>(kind: string, poolId?: string): Promise<T[]>;
  /** Returns false when this webhook transmission was already recorded (duplicate delivery). */
  recordWebhook(transmissionId: string, json: unknown): Promise<boolean>;
}

class FileStore implements Store {
  readonly kind = "file" as const;
  path = ".data/ledger.json";
  private load(): Record<string, Row> {
    if (!existsSync(this.path)) return {};
    try { return JSON.parse(readFileSync(this.path, "utf8")); } catch { return {}; }
  }
  private save(d: Record<string, Row>) { mkdirSync(".data", { recursive: true }); writeFileSync(this.path, JSON.stringify(d)); }
  async get<T>(kind: string, id: string) { return this.load()[`${kind}:${id}`]?.json as T | undefined; }
  async put(kind: string, id: string, poolId: string | null, json: unknown) {
    const d = this.load(); d[`${kind}:${id}`] = { kind, id, poolId, json, updatedAt: new Date().toISOString() }; this.save(d);
  }
  async list<T>(kind: string, poolId?: string) {
    return Object.values(this.load()).filter((r) => r.kind === kind && (!poolId || r.poolId === poolId))
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)).map((r) => r.json as T);
  }
  async recordWebhook(tid: string, json: unknown) {
    if (await this.get("webhook", tid)) return false;
    await this.put("webhook", tid, null, json); return true;
  }
}

type Sql = ReturnType<typeof import("postgres")["default"]>;
class PgStore implements Store {
  readonly kind = "postgres" as const;
  private ready: Promise<Sql>;
  constructor(url: string) {
    this.ready = (async () => {
      const { default: postgres } = await import("postgres");
      const sql = postgres(url, { max: 5, idle_timeout: 20, ssl: url.includes("localhost") ? false : "require" });
      await sql`create table if not exists records (kind text not null, id text not null, pool_id text, json jsonb not null, updated_at timestamptz not null default now(), primary key (kind, id))`;
      await sql`create index if not exists records_pool on records (kind, pool_id)`;
      await sql`create table if not exists webhook_events (transmission_id text primary key, json jsonb not null, received_at timestamptz not null default now())`;
      return sql;
    })();
  }
  async get<T>(kind: string, id: string) {
    const sql = await this.ready;
    const r = await sql`select json from records where kind = ${kind} and id = ${id}`;
    return r[0]?.json as T | undefined;
  }
  async put(kind: string, id: string, poolId: string | null, json: unknown) {
    const sql = await this.ready;
    await sql`insert into records (kind, id, pool_id, json, updated_at) values (${kind}, ${id}, ${poolId}, ${sql.json(json as never)}, now())
      on conflict (kind, id) do update set json = excluded.json, pool_id = excluded.pool_id, updated_at = now()`;
  }
  async list<T>(kind: string, poolId?: string) {
    const sql = await this.ready;
    const r = poolId
      ? await sql`select json from records where kind = ${kind} and pool_id = ${poolId} order by updated_at`
      : await sql`select json from records where kind = ${kind} order by updated_at`;
    return r.map((x) => x.json as T);
  }
  async recordWebhook(tid: string, json: unknown) {
    const sql = await this.ready;
    const r = await sql`insert into webhook_events (transmission_id, json) values (${tid}, ${sql.json(json as never)}) on conflict do nothing returning transmission_id`;
    return r.length > 0;
  }
}

let store: Store | null = null;
export function db(): Store {
  if (!store) store = process.env.DATABASE_URL ? new PgStore(process.env.DATABASE_URL) : new FileStore();
  return store;
}

/** The attempt log, kept in the ledger. */
export class LedgerAttempts implements AttemptStore {
  constructor(private s: Store) {}
  get(requestId: string) { return this.s.get<Attempt>("attempt", requestId); }
  start(a: Attempt) { return this.s.put("attempt", a.requestId, a.poolId, a); }
  async finish(requestId: string, result: NonNullable<Attempt["result"]>) {
    const a = await this.get(requestId);
    if (a) await this.s.put("attempt", requestId, a.poolId, { ...a, result, finishedAt: new Date().toISOString() });
  }
  list(poolId: string) { return this.s.list<Attempt>("attempt", poolId); }
}
