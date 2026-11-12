/**
 * House style, enforced. Fails on emoji, em or en dashes, hype words, and the banned word in the
 * README and the app. Run by `npm test`.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const BANNED = ["revolutionary", "seamless", "cutting-edge", "world-class", "zero-trust", "military-grade", "paradigm", "game-changing"];
const ONLY_IN_DISCLOSURES = "fict" + "ional";
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1F900}-\u{1F9FF}]/u;
const DASHES = /[–—]/;

const roots = ["README.md", "app", "components", "src", "JUDGE.md", "EVIDENCE.md", "FINDINGS.md", "SDK_SURFACE.md", "DESIGN.md", "FRICTION.md", "MOMENT.md", "THESIS.md"];
const exts = new Set([".md", ".ts", ".tsx", ".css", ".json"]);

function walk(p: string, out: string[]) {
  if (!existsSync(p)) return;
  const s = statSync(p);
  if (s.isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return; }
  if (exts.has(extname(p))) out.push(p);
}

export function checkText(text: string, file = "text"): string[] {
  const errs: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    if (EMOJI.test(line)) errs.push(`${at} emoji`);
    if (DASHES.test(line)) errs.push(`${at} em or en dash`);
    for (const w of BANNED) if (line.toLowerCase().includes(w)) errs.push(`${at} banned word "${w}"`);
    if ((file === "README.md" || file.startsWith("app")) && line.toLowerCase().includes(ONLY_IN_DISCLOSURES)) errs.push(`${at} word reserved for DISCLOSURES.md`);
  });
  return errs;
}

if (process.argv[1]?.endsWith("check-copy.ts")) {
  const files: string[] = [];
  for (const r of roots) walk(r, files);
  const errs = files.flatMap((f) => checkText(readFileSync(f, "utf8"), f.replace(/\\/g, "/")));
  if (errs.length) { console.error(errs.join("\n")); console.error(`house style: ${errs.length} problem(s)`); process.exit(1); }
  console.log(`house style: ${files.length} files clean`);
}
