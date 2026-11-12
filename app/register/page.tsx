import { classPool, getPool, listPools } from "@/src/pool/service";
import { RegisterView } from "./RegisterView";

export const dynamic = "force-dynamic";

export default async function Register({ searchParams }: { searchParams: Promise<{ pool?: string }> }) {
  const sp = await searchParams;
  const cls = await classPool();
  const runs = await listPools("live-run");
  const id = sp.pool ?? runs[0]?.id ?? cls.id;
  const v = await getPool(id);
  const slips = v && v.pool.kind === "class" ? Object.fromEntries(v.members.map((m) => [m.id, m.token])) : {};
  const pools = [cls, ...runs.slice(0, 10)].map((p) => ({ id: p.id, title: p.title, kind: p.kind, createdAt: p.createdAt }));
  return (
    <main className="mx-auto max-w-[1400px] px-4 pt-10">
      <RegisterView poolId={id} slips={slips} pools={pools} />
    </main>
  );
}
