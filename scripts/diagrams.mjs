// Hand-drawn diagrams (roughjs) rendered to PNG with Playwright: docs/images/architecture.png,
// docs/images/close-flow.png, docs/images/hold-lifecycle.png. Every blue chip names a path or call
// that exists in the shipped code. Usage: node scripts/diagrams.mjs
import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";

const rough = readFileSync("node_modules/roughjs/bundled/rough.js", "utf8");
mkdirSync("docs/images", { recursive: true });

const lib = `
const NS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("s");
const rc = rough.svg(svg);
const INK = "#16181d", HELD = "#3355ff", MUTED = "#4a4e57", SETTLED = "#0d8a60", REVIEW = "#b9741a", PAPER = "#fbfaf7";
function el(tag, attrs, text) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; svg.appendChild(e); return e; }
function text(x, y, t, o = {}) { return el("text", { x, y, "font-family": o.font || "Switzer, sans-serif", "font-size": o.size || 17, "font-weight": o.weight || 400, fill: o.fill || INK, "text-anchor": o.anchor || "start", "letter-spacing": o.ls || 0 }, t); }
function chipW(t, size) { return t.length * size * 0.62 + 16; }
function chip(x, y, t, color = HELD, size = 13) {
  const w = chipW(t, size);
  el("rect", { x, y: y - size - 3, width: w, height: size + 10, rx: 4, fill: color === HELD ? "#e6ebff" : color === SETTLED ? "#ddf3ea" : "#fbecd6" });
  text(x + 8, y + 1, t, { font: "JetBrains Mono, monospace", size, fill: color, weight: 600 });
  return w;
}
function box(x, y, w, h, o = {}) {
  svg.appendChild(rc.rectangle(x, y, w, h, { roughness: 1.15, bowing: 1.2, stroke: o.stroke || INK, strokeWidth: o.sw || 1.8, fill: o.fill || PAPER, fillStyle: "solid", seed: o.seed || 3 }));
  if (o.title) text(x + 18, y + 34, o.title, { font: "Sentient, Georgia, serif", size: o.tsize || 22, weight: 600, fill: o.tfill || INK });
  let yy = y + 34 + (o.title ? 30 : 0);
  for (const line of o.lines || []) {
    if (typeof line === "string") { text(x + 18, yy, line, { size: 15.5, fill: MUTED }); yy += 26; }
    else { let xx = x + 18; for (const c of line) { xx += chip(xx, yy, c.t, c.c) + 6; } yy += 30; }
  }
}
function arrow(x1, y1, x2, y2, o = {}) {
  svg.appendChild(rc.line(x1, y1, x2, y2, { roughness: 1.1, stroke: o.color || INK, strokeWidth: o.sw || 1.8, strokeLineDash: o.dash ? [8, 7] : undefined, seed: o.seed || 7 }));
  const a = Math.atan2(y2 - y1, x2 - x1), s = 13;
  svg.appendChild(rc.polygon([[x2, y2], [x2 - s * Math.cos(a - 0.42), y2 - s * Math.sin(a - 0.42)], [x2 - s * Math.cos(a + 0.42), y2 - s * Math.sin(a + 0.42)]], { fill: o.color || INK, fillStyle: "solid", stroke: o.color || INK, roughness: 0.6, seed: 9 }));
  if (o.label) { const mx = (x1 + x2) / 2 + (o.dx || 0), my = (y1 + y2) / 2 + (o.dy || -10); text(mx, my, o.label, { size: 14, fill: o.color || MUTED, anchor: "middle", weight: 500 }); }
}
function route(pts, o = {}) {
  for (let i = 0; i < pts.length - 2; i++) svg.appendChild(rc.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], { roughness: 1, stroke: o.color || INK, strokeWidth: o.sw || 1.8, strokeLineDash: o.dash ? [8, 7] : undefined, seed: 21 + i }));
  const n = pts.length; arrow(pts[n - 2][0], pts[n - 2][1], pts[n - 1][0], pts[n - 1][1], o);
}
function band(x, y, t, color = MUTED) { text(x, y, t, { size: 14, weight: 600, ls: 2.5, fill: color }); }
`;

const architecture = `
text(60, 72, "How Quorate works", { font: "Sentient, Georgia, serif", size: 44, weight: 600 });
text(60, 106, "PayPal sandbox, live. Every blue chip is a path or a call in the shipped code.", { size: 19, fill: MUTED });
const C = [60, 425, 790, 1155, 1520], W = 320;
band(C[0], 200, "PEOPLE"); band(C[1], 200, "QUORATE ON RENDER"); band(C[2], 200, "GEMINI HANDLES WORDS", "#7a3cc8"); band(C[3], 200, "THE BURSAR: CODE DECIDES", HELD); band(C[4], 200, "PAYPAL SANDBOX", HELD);
box(C[0], 220, W, 150, { title: "Teacher: The Register", lines: ["confirms the quote, approves the close", [{ t: "/register" }, { t: "AG Grid" }]], seed: 1 });
box(C[0], 390, W, 150, { title: "Family phone: the slip", lines: ["approves their own hold on PayPal", [{ t: "/slip/[token]" }], [{ t: "JS SDK intent=authorize" }]], seed: 2 });
box(C[0], 560, W, 130, { title: "School office: cash", lines: ["records cash it really received", [{ t: "Invoicing record-payment" }]], seed: 4 });
box(C[0], 710, W, 120, { title: "Judge door", lines: [[{ t: "/judge" }, { t: "/proof/[poolId]" }]], seed: 5 });
box(C[1], 220, W, 150, { title: "Next.js web and API", lines: ["one service, Starter plan", [{ t: "app/api/*" }, { t: "render.yaml" }]], seed: 6 });
box(C[1], 390, W, 140, { title: "Cron, every minute", lines: ["runs the Bursar: renew, lapse,", "close, poll payouts", [{ t: "scripts/tick.ts" }]], seed: 8 });
box(C[1], 540, W, 150, { title: "Postgres ledger", lines: ["state outlives every process", [{ t: "records" }, { t: "webhook_events" }]], seed: 10 });
box(C[1], 710, W, 120, { title: "Attempt log", lines: ["a row before every PayPal call", [{ t: "src/bursar/attempts.ts" }]], seed: 11 });
box(C[2], 220, W, 180, { stroke: "#7a3cc8", fill: "#f7f1ff", title: "Reader", tfill: "#7a3cc8", lines: ["vendor quote and parent replies into", "typed JSON; kept only if quoted", [{ t: "src/crew/reader.ts", c: REVIEW }]], seed: 13 });
box(C[2], 420, W, 160, { stroke: "#7a3cc8", fill: "#f7f1ff", title: "Scribe", tfill: "#7a3cc8", lines: ["slip notes in en, es, vi; every", "number comes from code", [{ t: "numbersMatch()", c: REVIEW }]], seed: 14 });
box(C[2], 600, W, 230, { stroke: "#7a3cc8", fill: "#f7f1ff", title: "Clerk", tfill: "#7a3cc8", lines: ["help desk, read-only PayPal tools", [{ t: "get_order" }, { t: "get_invoice" }], [{ t: "list_transactions" }], "no tool that moves money", [{ t: "PayPal Agent Toolkit" }]], seed: 15 });
box(C[3], 220, W, 610, { stroke: HELD, sw: 2.6, fill: "#f4f6ff", title: "Every amount, in cents", tfill: HELD, lines: [
  "water-filling: one price L; low caps", "pay their cap; exact to the cent", [{ t: "allocate.ts" }], "",
  "renew so the 3-day honor window", "covers the close; 29-day validity", [{ t: "renewal.ts" }], "",
  "refuse any capture above what a", "family approved (PayPal allows 115%)", [{ t: "assertWithinCap" }], [{ t: "assertTermsUnchanged" }], "",
  "the close: capture, re-share on a", "decline, top up, void, pay out", [{ t: "close.ts" }]], seed: 12 });
box(C[4], 220, W, 120, { stroke: HELD, title: "Orders v2", lines: [[{ t: "intent: AUTHORIZE" }], [{ t: "POST /v2/checkout/orders" }]], seed: 16 });
box(C[4], 355, W, 175, { stroke: HELD, title: "Payments v2", lines: [[{ t: "capture final_capture:false" }], [{ t: "void" }, { t: "reauthorize" }], [{ t: "captures/{id}/refund" }]], seed: 17 });
box(C[4], 545, W, 95, { stroke: HELD, title: "Vault v3", lines: [[{ t: "/v3/vault/payment-tokens" }]], seed: 18 });
box(C[4], 655, W, 95, { stroke: HELD, title: "Payouts", lines: [[{ t: "POST /v1/payments/payouts" }]], seed: 19 });
box(C[4], 765, W, 65, { stroke: HELD, lines: [[{ t: "verify-webhook-signature" }]], seed: 20 });
arrow(C[0] + W + 2, 295, C[1] - 2, 295);
arrow(C[1] + W + 2, 300, C[2] - 2, 300);
arrow(C[2] + W + 2, 310, C[3] - 2, 310, { color: "#7a3cc8" });
arrow(C[3] + W + 2, 440, C[4] - 2, 440, { color: HELD, sw: 2.6 });
arrow(C[3] + W + 2, 700, C[4] - 2, 700, { color: HELD, sw: 2.6 });
route([[C[0] + W + 2, 470], [C[0] + W + 22, 470], [C[0] + W + 22, 160], [C[4] + 60, 160], [C[4] + 60, 218]], { color: HELD, dash: true });
text((C[0] + C[4]) / 2 + 120, 150, "each family approves their own hold on PayPal", { size: 15, fill: HELD, anchor: "middle", weight: 600 });
route([[C[4] + W / 2, 832], [C[4] + W / 2, 862], [C[1] + W / 2, 862], [C[1] + W / 2, 832]], { color: SETTLED, dash: true });
text((C[1] + C[4]) / 2 + 160, 884, "webhooks, signature verified, duplicates ignored, recorded in the ledger", { size: 15, fill: SETTLED, anchor: "middle", weight: 600 });
text(C[2] + W + 6, 296, "JSON", { size: 13, fill: "#7a3cc8", weight: 600 });
box(60, 910, 1780, 70, { stroke: INK, fill: "#fffaf0", seed: 30 });
text(950, 953, "Models read and write words.  The Bursar decides every amount.  Families approve on PayPal.  The teacher decides when a close cannot finish within what families approved.", { size: 18, anchor: "middle", weight: 500 });
`;

const closeFlow = `
text(60, 72, "The close", { font: "Sentient, Georgia, serif", size: 44, weight: 600 });
text(60, 106, "src/bursar/close.ts. Each PayPal call writes an attempt row first, with PayPal-Request-Id = sha256(pool:member:op:attempt).", { size: 19, fill: MUTED });
const y = 170, h = 190, w = 250, g = 52;
const X = [60, 60 + (w + g), 60 + 2 * (w + g), 60 + 3 * (w + g), 60 + 4 * (w + g), 60 + 5 * (w + g)];
box(X[0], y, w, h, { title: "1 Freeze", lines: ["read back every hold", [{ t: "GET authorizations/{id}" }], "expired holds drop out"], seed: 1 });
box(X[1], y, w, h, { title: "2 Allocate", lines: ["one price L for all", "children; exact to", "the cent", [{ t: "allocate()" }]], seed: 2 });
box(X[2], y, w, h, { stroke: HELD, sw: 2.4, title: "3 Capture", tfill: HELD, lines: ["each share, join order", [{ t: "final_capture:false" }], [{ t: "assertWithinCap" }]], seed: 3 });
box(X[3], y, w, h, { title: "5 Release", lines: ["refund if a share fell,", "void every remainder", [{ t: "void" }, { t: "refund" }]], seed: 4 });
box(X[4], y, w, h, { title: "6 Pay vendors", lines: ["coach and museum in", "one batch", [{ t: "sender_batch_id" }]], seed: 5 });
box(X[5], y, w - 20, h, { stroke: SETTLED, sw: 2.6, fill: "#effaf5", title: "CLOSED", tfill: SETTLED, lines: ["charged = vendors due", "0 cents off", "nobody above cap"], seed: 6 });
for (let i = 0; i < 5; i++) arrow(X[i] + w, y + h / 2, X[i + 1], y + h / 2);
box(X[2] - 40, 470, w + 80, 200, { stroke: "#b42318", sw: 2.4, fill: "#fff4f2", title: "4 PayPal declines", tfill: "#b42318", lines: ["sandbox negative testing:", [{ t: "PAYER_CANNOT_PAY", c: REVIEW }], "drop that family, re-share,", "top up from the same holds"], seed: 7 });
arrow(X[2] + w / 2 - 30, y + h, X[2] + w / 2 - 30, 470, { color: "#b42318", label: "decline", dx: -44, dy: 0 });
arrow(X[2] + w / 2 + 40, 470, X[2] + w / 2 + 40, y + h, { color: "#b42318", label: "top-ups", dx: 46, dy: 0 });
box(X[0], 470, 2 * w + g - 20, 200, { stroke: REVIEW, sw: 2.2, fill: "#fffaf0", title: "NEEDS_TEACHER", tfill: REVIEW, lines: ["below the minimum, or caps cannot cover", "the total; options computed by code:", [{ t: "SPONSOR_GAP", c: REVIEW }, { t: "WAIT_FOR_FAMILIES", c: REVIEW }], [{ t: "CANCEL: refund every capture, void every hold", c: REVIEW }]], seed: 8 });
arrow(X[1] + w / 2, y + h, X[1] + w / 2, 470, { color: REVIEW, label: "infeasible", dx: -50, dy: 0 });
box(X[3] + 20, 470, 2 * w + g + 10, 200, { stroke: INK, fill: "#f6f6f4", title: "Crash anywhere", lines: ["on restart, finished calls replay from the log;", "an unfinished call is resent with the same", "request id, and PayPal returns the original.", "A different payload is held for the teacher.", [{ t: "attempts.ts" }, { t: "HELD_FOR_TEACHER", c: REVIEW }]], seed: 9 });
text(60, 740, "Live on the sandbox, 12 Nov 2026: PayPal declined family 7 of 20; Quorate re-shared among 19, topped up six families by $3.79 each from their own holds,", { size: 17, fill: MUTED });
text(60, 768, "released the rest, and paid the vendors exactly $1,592.00. A run killed after its 9th capture restarted with no capture repeated.", { size: 17, fill: MUTED });
`;

const lifecycle = `
text(60, 72, "One hold, from slip to settlement", { font: "Sentient, Georgia, serif", size: 40, weight: 600 });
text(60, 104, "src/bursar/renewal.ts and the PayPal authorization rules measured in FINDINGS.md", { size: 18, fill: MUTED });
const x0 = 100, x1 = 1760, y = 300, day = (x1 - x0) / 30;
svg.appendChild(rc.line(x0, y, x1, y, { stroke: INK, strokeWidth: 2, roughness: 0.8 }));
for (let d = 0; d <= 30; d += 3) { svg.appendChild(rc.line(x0 + d * day, y - 8, x0 + d * day, y + 8, { stroke: INK, roughness: 0.5 })); text(x0 + d * day, y + 34, "day " + d, { size: 14, anchor: "middle", fill: MUTED }); }
svg.appendChild(rc.rectangle(x0, y - 70, 3 * day, 40, { fill: "#c9d3ff", fillStyle: "hachure", hachureGap: 6, stroke: HELD, roughness: 1 }));
text(x0 + 8, y - 82, "honor period: 3 days", { size: 15, fill: HELD, weight: 600 });
svg.appendChild(rc.rectangle(x0, y - 20, 29 * day, 16, { fill: "#e6ebff", fillStyle: "solid", stroke: HELD, roughness: 1 }));
text(x0 + 29 * day, y - 26, "valid 29 days (probe P9)", { size: 14, fill: HELD, anchor: "end" });
const close = x0 + 10 * day, renew = x0 + 7 * day;
svg.appendChild(rc.rectangle(renew, y - 130, 3 * day, 40, { fill: "#ddf3ea", fillStyle: "hachure", hachureGap: 6, stroke: SETTLED, roughness: 1 }));
text(renew + 6, y - 142, "renewed honor window covers the close", { size: 15, fill: SETTLED, weight: 600 });
arrow(renew, y + 70, renew, y + 12, { color: SETTLED }); text(renew, y + 92, "renew at max(t0+3d, close-3d)", { size: 15, anchor: "middle", fill: SETTLED, weight: 600 });
arrow(close, y + 130, close, y + 12, { color: INK }); text(close, y + 152, "Friday close", { size: 16, anchor: "middle", weight: 600 });
arrow(x0 + 1.5, y + 70, x0 + 1.5, y + 12, { color: HELD }); text(x0 + 4, y + 92, "family approves $88.00", { size: 15, fill: HELD, weight: 600 });
text(x0 + 0.4 * day, y + 120, "renewing at once: 422 REAUTHORIZATION_TOO_SOON (P4)", { size: 14, fill: REVIEW });
box(100, 520, 520, 150, { title: "At the close", lines: ["capture the real share, $80.00", "void the remainder, $8.00 released (P1, P2)"], seed: 3 });
box(660, 520, 520, 150, { stroke: "#b42318", title: "PayPal would accept $80 on $72", tfill: "#b42318", lines: ["probe P3: over-capture accepted", "Quorate refuses it before every capture"], seed: 4 });
box(1220, 520, 540, 150, { title: "Past day 29", lines: ["the hold cannot reach the close:", "CANNOT_REACH_CLOSE, the teacher closes earlier"], seed: 5 });
`;

const pages = [["architecture", architecture, 1900, 1000], ["close-flow", closeFlow, 1890, 800], ["hold-lifecycle", lifecycle, 1860, 700]];
const browser = await chromium.launch();
for (const [name, body, w, h] of pages) {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=sentient@600&f[]=switzer@400,500,600&display=swap"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600&display=swap"><style>html,body{margin:0;background:#f2f0eb}</style></head><body><svg id="s" xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="background:#f2f0eb"></svg><script>${rough}</script><script>${lib}${body}</script></body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `docs/images/${name}.png` });
  console.log(`docs/images/${name}.png`);
  await page.close();
}
await browser.close();
