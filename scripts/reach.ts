/** Reachability check after a deploy: every public path must answer. Usage: tsx scripts/reach.ts <baseUrl> */
export {};
const base =(process.argv[2] ?? process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const paths = ["/", "/api/live", "/api/status"];
let bad = 0;
for (const p of paths) {
  const t = Date.now();
  try {
    const r = await fetch(base + p, { redirect: "manual" });
    console.log(`${r.status} ${p} ${Date.now() - t}ms`);
    if (r.status >= 400) bad++;
  } catch (e) { console.log(`ERR ${p} ${(e as Error).message}`); bad++; }
}
process.exit(bad ? 1 : 0);
