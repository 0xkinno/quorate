import { generateText } from "ai";
import { backend, model, MODEL_ID } from "./model";
import { numbersMatch, slipText, type SlipFacts } from "./slip";
import { toAmount } from "../paypal/types";

/**
 * The Scribe: writes the short note that goes home with a slip, in the family's language. Code
 * supplies every number; numbersMatch() rejects any text carrying a number the code did not supply,
 * and then the fixed template is sent instead. The model never sees PayPal data.
 */
export async function writeNote(lang: "en" | "es" | "vi", f: SlipFacts) {
  const t = slipText(lang, f);
  const fallback = `${t.title}. ${t.amount}. ${t.promise} ${t.when}`;
  const allowed = [`$${toAmount(f.capCents)}`, String(f.minN), new Date(f.closeAt).toISOString().slice(0, 10), f.child, f.school];
  if (backend() === "replay") return { text: fallback, source: "template" as const, model: "replay", usage: null };
  const names = { en: "English", es: "Spanish", vi: "Vietnamese" } as const;
  const r = await generateText({
    model: model(),
    system: `Write a warm, plain three-sentence note to a parent in ${names[lang]} about a class trip permission slip. Use only these facts and numbers, copied exactly: ${JSON.stringify({ child: f.child, school: f.school, heldToday: `$${toAmount(f.capCents)}`, minimumChildren: f.minN, decisionDate: allowed[2] })}. Say the amount is held on PayPal, not charged; it is charged only if the trip runs, it falls as more children join, and it never goes above the held amount. No other numbers. No emoji.`,
    prompt: "Write the note.",
  });
  const ok = numbersMatch(r.text, allowed);
  return { text: ok ? r.text.trim() : fallback, source: ok ? ("model" as const) : ("template" as const), model: MODEL_ID, usage: r.usage, rejected: ok ? undefined : r.text };
}
