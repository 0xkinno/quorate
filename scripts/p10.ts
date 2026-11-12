/** P10: does the Agent Toolkit get_order tool return authorization details for an AUTHORIZE order? */
import { writeFileSync } from "node:fs";
import { paypalReadTools } from "../src/crew/clerk";
import { createCardHold } from "../src/paypal/cardhold";
const h = await createCardHold({ memberId: "p10", poolId: "probe", capCents: 8800, termsHash: "p10".padEnd(64, "0"), requestId: crypto.randomUUID() });
const tools = await paypalReadTools();
const names = Object.keys(tools);
const out = await (tools.get_order as unknown as { execute: (a: unknown, o: unknown) => Promise<unknown> }).execute({ id: h.orderId }, { toolCallId: "p10", messages: [] });
const text = typeof out === "string" ? out : JSON.stringify(out);
writeFileSync(`docs/probe/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}-p10.json`, JSON.stringify({ orderId: h.orderId, authId: h.authId, tools: names, result: out }, null, 2));
console.log("tools", names.join(","), "| has auth id:", text.includes(h.authId), "| intent AUTHORIZE:", text.includes("AUTHORIZE"), "|", text.slice(0, 200));
