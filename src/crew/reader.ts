import { generateText, Output } from "ai";
import { z } from "zod";
import { backend, model, MODEL_ID } from "./model";

/**
 * The Reader: turns a vendor quote or a parent's reply into typed JSON. It has no tools and never
 * sees PayPal data. Code keeps a value only if its quote appears word for word in the source and the
 * number parses from that quote; anything else goes to REVIEW for the teacher.
 */
export const QuoteSchema = z.object({
  vendors: z.array(z.object({
    name: z.string(), fixedCents: z.number().int().nonnegative(), perHeadCents: z.number().int().nonnegative(),
    quote: z.string().describe("exact words from the quote that state this amount"),
  })),
  minChildren: z.number().int().positive().optional(), payBy: z.string().optional(), confidence: z.enum(["HIGH", "LOW"]),
});
export const ReplySchema = z.object({
  intent: z.enum(["JOIN", "JOIN_WITH_CAP", "TWO_CHILDREN", "CASH", "DECLINE", "QUESTION", "UNCLEAR"]),
  capCents: z.number().int().optional(), quote: z.string(), confidence: z.enum(["HIGH", "LOW"]),
});
export type Quote = z.infer<typeof QuoteSchema>;
export type Reply = z.infer<typeof ReplySchema>;

const centsIn = (s: string) => (s.match(/\$?\d[\d,]*(?:\.\d{2})?/g) ?? []).map((m) => Math.round(Number(m.replace(/[$,]/g, "")) * 100));

/** Code check: the quote must be in the source and must contain the number. */
export function checkQuote(source: string, q: Quote) {
  const issues: string[] = [];
  for (const v of q.vendors) {
    if (!source.includes(v.quote)) issues.push(`${v.name}: quoted words not found in the source`);
    const nums = centsIn(v.quote);
    if (!nums.includes(v.fixedCents || v.perHeadCents)) issues.push(`${v.name}: amount not stated in its quote`);
  }
  return { verdict: issues.length || q.confidence === "LOW" ? ("REVIEW" as const) : ("OK" as const), issues };
}

/** A reply can lower a family's own cap, never raise it above the slip amount. */
export function checkReply(source: string, r: Reply, slipCapCents: number) {
  if (!source.includes(r.quote) || r.confidence === "LOW") return { verdict: "REVIEW" as const, capCents: slipCapCents, why: "not quoted from the reply or low confidence" };
  if (r.capCents !== undefined) {
    if (!centsIn(r.quote).includes(r.capCents)) return { verdict: "REVIEW" as const, capCents: slipCapCents, why: "amount not stated in the quote" };
    if (r.capCents > slipCapCents) return { verdict: "REVIEW" as const, capCents: slipCapCents, why: "above the slip amount: refused" };
  }
  return { verdict: "OK" as const, capCents: r.capCents ?? slipCapCents, why: "" };
}

export const DEMO_QUOTE = `Bayline Coaches - Quote 2611-04
49-seat coach, round trip Harbor View Elementary to Harbor Science Museum, Friday 9:00am to 2:30pm.
Total: $1,440.00. Confirm and pay by Friday noon or lose the date.
Harbor Science Museum group rate: $8.00 per child, chaperones free. Minimum of 18 children for the trip to run.`;

export async function readQuote(text: string) {
  if (backend() === "replay") {
    const q: Quote = { vendors: [
      { name: "Bayline Coaches", fixedCents: 144_000, perHeadCents: 0, quote: "Total: $1,440.00" },
      { name: "Harbor Science Museum", fixedCents: 0, perHeadCents: 800, quote: "$8.00 per child" },
    ], minChildren: 18, payBy: "Friday noon", confidence: "HIGH" };
    return { quote: q, check: checkQuote(text, q), model: "replay" };
  }
  const r = await generateText({
    model: model(), output: Output.object({ schema: QuoteSchema }),
    system: "Read a vendor quote for a school trip. Return every vendor with amounts in integer cents: a fixed amount or a per-child amount. For each, copy the exact words from the quote that state the amount. If unsure, set confidence LOW.",
    prompt: text,
  });
  const q = r.output as Quote;
  return { quote: q, check: checkQuote(text, q), model: MODEL_ID };
}

export async function readReply(text: string, slipCapCents: number) {
  if (backend() === "replay") {
    const r: Reply = { intent: "UNCLEAR", quote: text.slice(0, 40), confidence: "LOW" };
    return { reply: r, check: checkReply(text, r, slipCapCents), model: "replay" };
  }
  const out = await generateText({
    model: model(), output: Output.object({ schema: ReplySchema }),
    system: "Read a parent's reply to a class trip slip. Classify the intent. If they name the most they can pay, put it in capCents. Copy the exact words you relied on into quote.",
    prompt: text,
  });
  const r = out.output as Reply;
  return { reply: r, check: checkReply(text, r, slipCapCents), model: MODEL_ID };
}
