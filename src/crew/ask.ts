import { generateText, Output } from "ai";
import { z } from "zod";
import { backend, model, MODEL_ID } from "./model";

/**
 * "Ask the register": a teacher's question becomes an AG Grid filter model. The model proposes; code
 * validates every column, operator and value against the grid's own schema, and anything else is rejected
 * and shown. The model never sees PayPal data and the filter can only narrow what is already on screen.
 */
export const COLUMNS = {
  child: { kind: "text", label: "Child" },
  family: { kind: "text", label: "Family" },
  lang: { kind: "text", label: "Language", values: ["en", "es", "vi"] },
  status: { kind: "text", label: "Status", values: ["INVITED", "HELD", "SETTLED", "RELEASED", "DECLINED", "REVIEW", "CAPTURED_PART"] },
  verdict: { kind: "text", label: "Verdict", values: ["OBSERVED", "REVIEW", "NOT OBSERVED"] },
  capCents: { kind: "number", label: "Approved (cents)" },
  nowCents: { kind: "number", label: "If the trip ran now (cents)" },
  chargedCents: { kind: "number", label: "Charged (cents)" },
  releasedCents: { kind: "number", label: "Released (cents)" },
} as const;
type Col = keyof typeof COLUMNS;
const TEXT_OPS = ["equals", "notEqual", "contains"] as const;
const NUM_OPS = ["equals", "notEqual", "greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"] as const;

const Proposal = z.object({ filters: z.array(z.object({ column: z.string(), op: z.string(), value: z.union([z.string(), z.number()]) })), explanation: z.string() });
export type Filter = { column: Col; op: string; value: string | number };
export type AgFilterModel = Record<string, { filterType: "text" | "number"; type: string; filter: string | number }>;

export function validate(filters: { column: string; op: string; value: string | number }[]) {
  const ok: Filter[] = [], rejected: string[] = [];
  for (const f of filters) {
    const c = COLUMNS[f.column as Col];
    if (!c) { rejected.push(`unknown column "${f.column}"`); continue; }
    if (c.kind === "text") {
      if (!(TEXT_OPS as readonly string[]).includes(f.op)) { rejected.push(`"${f.op}" is not allowed on ${c.label}`); continue; }
      const v = String(f.value);
      if ("values" in c && !(c.values as readonly string[]).includes(v.toUpperCase()) && !(c.values as readonly string[]).includes(v)) { rejected.push(`"${v}" is not a ${c.label} value`); continue; }
      ok.push({ column: f.column as Col, op: f.op, value: "values" in c && (c.values as readonly string[]).includes(v.toUpperCase()) ? v.toUpperCase() : v });
    } else {
      const n = typeof f.value === "number" ? f.value : Number(String(f.value).replace(/[$,]/g, ""));
      if (!(NUM_OPS as readonly string[]).includes(f.op) || !Number.isFinite(n)) { rejected.push(`"${f.op} ${f.value}" is not a valid ${c.label} filter`); continue; }
      ok.push({ column: f.column as Col, op: f.op, value: Math.round(n) });
    }
  }
  const agModel: AgFilterModel = {};
  for (const f of ok) agModel[f.column] = { filterType: COLUMNS[f.column].kind as "text" | "number", type: f.op, filter: f.value };
  return { filters: ok, rejected, agModel };
}

/** Rules used when no model is available: a handful of phrasings a teacher is likely to type. */
function rules(q: string) {
  const s = q.toLowerCase();
  const f: { column: string; op: string; value: string | number }[] = [];
  for (const st of ["declined", "settled", "released", "held", "invited", "review"]) if (s.includes(st)) f.push({ column: "status", op: "equals", value: st.toUpperCase() });
  if (/spanish/.test(s)) f.push({ column: "lang", op: "equals", value: "es" });
  if (/vietnamese/.test(s)) f.push({ column: "lang", op: "equals", value: "vi" });
  if (/english/.test(s)) f.push({ column: "lang", op: "equals", value: "en" });
  const m = /(more|over|above|less|under|below) than? \$?(\d+(?:\.\d{1,2})?)/.exec(s);
  if (m) f.push({ column: "chargedCents", op: /more|over|above/.test(m[1]) ? "greaterThan" : "lessThan", value: Math.round(Number(m[2]) * 100) });
  return f;
}

export async function askRegister(question: string) {
  if (backend() === "replay") {
    const v = validate(rules(question));
    return { ...v, explanation: "Matched by rules (no model call).", model: "rules" };
  }
  try {
    const r = await generateText({
      model: model(), maxRetries: 0, output: Output.object({ schema: Proposal }),
      system: `Turn a teacher's question about a class trip register into AG Grid filters. Columns: ${Object.entries(COLUMNS).map(([k, c]) => `${k} (${c.kind}${"values" in c ? `: ${c.values.join("|")}` : ""})`).join(", ")}. Money columns are integer cents ($80.00 is 8000). Text operators: ${TEXT_OPS.join(", ")}. Number operators: ${NUM_OPS.join(", ")}. Return only filters you are sure of, and one short explanation.`,
      prompt: question,
    });
    const p = r.output as z.infer<typeof Proposal>;
    return { ...validate(p.filters), explanation: p.explanation, model: MODEL_ID };
  } catch {
    const v = validate(rules(question));
    return { ...v, explanation: "The model was unavailable, so rules matched the question.", model: "rules (model unavailable)" };
  }
}
