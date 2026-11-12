import { generateText, stepCountIs, tool, type Tool } from "ai";
import { z } from "zod";
import { backend, model, MODEL_ID } from "./model";
import { getPool, memberByToken } from "../pool/service";

/**
 * The Clerk: help desk for parents and the teacher. Read-only PayPal Agent Toolkit tools
 * (get_order, get_invoice, list_transactions) plus our own pool_status. It holds no tool that
 * creates, captures, refunds, pays or cancels; tests/clerk.test.ts enforces the list.
 */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`, "g");

export const CLERK_ACTIONS = { orders: { get: true }, invoices: { get: true }, transactions: { list: true } } as const;
export const CLERK_TOOLS = ["get_order", "get_invoice", "list_transactions"] as const;
export const MONEY_TOOL = /create_order|pay_order|refund|capture|send_invoice|cancel|accept_dispute|subscription|record_payment|create_invoice|delete/;

type V4Tool = { description?: string; parameters: unknown; execute: (args: unknown, opts?: unknown) => Promise<unknown> };

export async function paypalReadTools(): Promise<Record<string, Tool>> {
  if (!process.env.PAYPAL_CLIENT_ID) return {};
  const { PayPalAgentToolkit } = await import("@paypal/agent-toolkit/ai-sdk");
  const kit = new PayPalAgentToolkit({
    clientId: process.env.PAYPAL_CLIENT_ID!, clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    configuration: { actions: CLERK_ACTIONS as unknown as Record<string, Record<string, boolean>>, context: { sandbox: true } },
  });
  const raw = kit.getTools() as unknown as Record<string, V4Tool>;
  const out: Record<string, Tool> = {};
  for (const [name, t] of Object.entries(raw)) {
    // Exact allow-list first; the money pattern is a second line of defence.
    if (!CLERK_TOOLS.includes(name as (typeof CLERK_TOOLS)[number]) || MONEY_TOOL.test(name)) throw new Error(`CLERK_REFUSES_TOOL ${name}`);
    // The toolkit targets an older AI SDK tool shape; adapt it without changing what it does.
    out[name] = tool({ description: t.description ?? name, inputSchema: t.parameters as never, execute: async (args: unknown) => t.execute(args) }) as Tool;
  }
  return out;
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;

export async function poolFacts(ref: { token?: string; poolId?: string }) {
  const f = ref.token ? await memberByToken(ref.token) : null;
  const poolId = f?.pool.id ?? ref.poolId;
  if (!poolId) return null;
  const v = await getPool(poolId);
  if (!v) return null;
  const member = f ? v.members.find((m) => m.id === f.member.id) : undefined;
  const out = member ? v.close?.members?.find((m) => m.id === member.id) : undefined;
  return {
    trip: v.pool.title, school: v.pool.school, state: v.pool.state, childrenHeld: v.heldCount, minimum: v.pool.minN,
    sharePerChildNow: v.preview.ok ? usd(v.preview.level) : null, holdAmount: usd(v.members[0]?.capCents ?? 0),
    closesAt: v.pool.closeAt, payments: v.pool.port === "sandbox" ? "PayPal sandbox" : "PayPal stand-in",
    member: member ? { child: member.child, state: member.state, orderId: member.orderId, authorizationId: member.authId, guaranteedUntil: member.honorUntil,
      charged: out ? usd(out.chargedCents) : null, released: out ? usd(out.releasedCents) : null } : undefined,
    close: v.close?.reconciled ? { familiesCharged: usd(v.close.reconciled.netCharged), vendorsPaid: usd(v.close.reconciled.vendorsDue), exact: v.close.reconciled.exact } : undefined,
  };
}

export async function askClerk(question: string, ref: { token?: string; poolId?: string }) {
  const facts = await poolFacts(ref);
  const replay = (why: string) => {
    const a = facts ? `${why} The trip "${facts.trip}" has ${facts.childrenHeld} children held (at least ${facts.minimum} needed). Each family's PayPal holds ${facts.holdAmount}, the most it can ever cost.${facts.sharePerChildNow ? ` If the trip closed now each family would pay ${facts.sharePerChildNow}.` : ""}${facts.close ? ` At the close families were charged ${facts.close.familiesCharged} in total and the vendors were paid ${facts.close.vendorsPaid}${facts.close.exact ? ", exact to the cent" : ""}.` : ""} The rest of every hold is released at the close.` : "I could not find that trip.";
    return { answer: a, tools: [] as string[], model: "template", usage: undefined };
  };
  if (backend() === "replay") {
    const a = facts ? `This is a recorded answer (no model call). The trip "${facts.trip}" has ${facts.childrenHeld} children held (at least ${facts.minimum} needed). Each family's PayPal holds ${facts.holdAmount}, the most it can ever cost.${facts.sharePerChildNow ? ` If the trip closed now each family would pay ${facts.sharePerChildNow}.` : ""} The rest of every hold is released at the close.` : "I could not find that trip.";
    return { answer: a, tools: [] as string[], model: "replay" };
  }
  const tools: Record<string, Tool> = {
    ...(await paypalReadTools()),
    pool_status: tool({ description: "Current state of this class trip pool: children held, share per child, the asking family's hold and charge.", inputSchema: z.object({}), execute: async () => facts }),
  };
  const used: string[] = [];
  let r;
  try {
  r = await generateText({
    model: model(), tools, stopWhen: stepCountIs(5),
    system: "You are the help desk for Quorate, where each family's PayPal holds their child's share of a class trip. Answer in plain, short sentences, in the language of the question. Use pool_status first. You may read PayPal orders, invoices and transactions to explain them. You cannot move money; if asked to charge, refund or change an amount, say the teacher decides that in The Register. Never invent an amount: use only amounts from tool results. No emoji.",
    prompt: question,
    onStepFinish: (s) => { for (const c of s.toolCalls ?? []) used.push(c.toolName); },
  });
  } catch (e) {
    const busy = /quota|429|RESOURCE_EXHAUSTED|overloaded|high demand|503|UNAVAILABLE/i.test(String((e as Error).message));
    return replay(busy ? "The model is busy right now, so this is a template answer from the trip's facts." : "The model could not answer just now, so this is a template answer from the trip's facts.");
  }
  return { answer: r.text.replace(DASHES, ","), tools: used, model: MODEL_ID, usage: r.totalUsage };
}
