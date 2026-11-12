import { classPool, getPool, listPools } from "@/src/pool/service";
import { RegisterView } from "./RegisterView";

export const dynamic = "force-dynamic";

export default async function Register({ searchParams }: { searchParams: Promise<{ pool?: string }> }) {
  const sp = await searchParams;
  const cls = await classPool();
  const runs = await listPools("live-run");
  const id = sp.pool === "class" ? cls.id : sp.pool ?? runs.find((p) => p.state === "CLOSED")?.id ?? runs[0]?.id ?? cls.id;
  const v = await getPool(id);
  const slips = v && v.pool.kind === "class" ? Object.fromEntries(v.members.map((m) => [m.id, m.token])) : {};
  const shown = [cls, ...runs.slice(0, 20)];
  if (v && !shown.some((p) => p.id === v.pool.id)) shown.push(v.pool);
  const pools = shown.map((p) => ({ id: p.id, title: p.title, kind: p.kind, createdAt: p.createdAt }));
  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-10">
      <RegisterView poolId={id} slips={slips} pools={pools} />
    </main>
  );
}
