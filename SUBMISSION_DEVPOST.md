# Devpost submission: Quorate

Field by field, ready to paste. Numbers are from `docs/FACTS.json`.

## Project name
Quorate

## Elevator pitch (200 characters)
Group payments without a group payer: each family's PayPal holds their child's share of a class trip, and nobody is charged until enough children are going.

## Inspiration
Every field trip starts the same way: a teacher pays for the coach on her own card, then chases twenty-six
families for weeks. US teachers already spend an average of $895 a year of their own money on their
classrooms (AdoptAClassroom.org, 2025). PayPal closed its Money Pools collection product in 2021, and the
problem of one person fronting money for a group never went away. We wanted the purchase to wait for the
group, and the price to fall as the group grows.

## What it does
A teacher pastes the coach quote; Gemini reads it into amounts, each tied to the words it came from, and code
checks every one. Each family gets a slip in English, Spanish or Vietnamese and approves a PayPal hold for the
worst-case share ($88.00 at the 18-child minimum). As children join, the real share falls ($80.00 at 20,
$63.38 at 26). At the close, Quorate captures each family's real share, releases the rest of every hold, and
pays the coach company and the museum in one PayPal payout. If PayPal declines a capture mid-close, Quorate
re-shares among the rest and tops up the families already captured from their own holds, never above what
each approved. If the trip does not reach its minimum, nobody is charged.

## How we built it
- **The Bursar** (plain TypeScript, integer cents): one price for everyone by water-filling, exact to the cent,
  with six properties checked at 10,000 random cases each; a renewal scheduler for the 3-day honor period and
  29-day validity; guards that refuse any capture above the approved amount or on changed terms.
- **The close**: every PayPal call is preceded by an attempt row and carries a request id derived from pool,
  member, operation and attempt, so a crash never captures twice.
- **PayPal**: Orders v2 AUTHORIZE, Payments v2 partial capture with `final_capture:false`, void, reauthorize and
  refund, Payouts, Invoicing for cash families, Vault v3 for trips past what a hold can reach, verified
  webhooks, sandbox negative testing for the decline, the PayPal Server SDK, and the PayPal Agent Toolkit with
  read-only tools for the help desk.
- **AI**: Gemini (`gemini-3-flash-preview`) through the Vercel AI SDK reads quotes and replies, writes slip
  notes in three languages, and answers parents; code keeps every number out of the models' hands.
- **UI**: Next.js on Render (web, cron, Postgres from one Blueprint); The Register on AG Grid and AG Charts;
  the honor timeline on Bryntum Scheduler; a read-only MCP door for families' assistants.

## Challenges we ran into
- A Friday close against a 3-day honor period: holds are renewed once, timed so the new window covers the close.
- PayPal declining a capture after other families were already charged: solved with partial captures and
  top-ups from the same authorizations.
- PayPal accepted an $80.00 capture on a $72.00 hold in our probe, as its 115% rule allows; a family who saw
  "never more than $88.00" must never pay more, so Quorate refuses before every capture.
- Sandbox account setup: country restrictions on holds and payouts, and which mock codes each call honours
  (all written up for PayPal in FRICTION.md).

## Accomplishments that we're proud of
13 live sandbox runs, 9 of 9 closes exact to the cent, 3 closes that survived a PayPal-injected decline,
205 real holds, $13,930.00 settled, 0 cents off, and 0 families charged above what they approved. A run
killed after its 9th capture restarted with no capture repeated.

## What we learned
The ten probe questions we wrote down before the first call (FINDINGS.md): partial captures and void behave as
documented; over-capture is accepted; `INSTRUMENT_DECLINED` is not a mock code for authorization capture; a
repeated request id returns the original capture; payouts settle in about 25 seconds.

## What's next
Pilots with a PTA and a youth sports club; exports for the school office; per-family Vault for long-lead trips;
sponsors who can pledge to cover the last children.

## Built with
paypal-orders-v2, paypal-payments-v2, paypal-payouts, paypal-invoicing, paypal-vault, paypal-webhooks,
paypal-server-sdk, paypal-agent-toolkit, paypal-js-sdk, gemini, vercel-ai-sdk, next.js, react, typescript,
postgresql, render, ag-grid, ag-charts, bryntum, motion, playwright, vitest, fast-check

## Try it out
- Live: https://quorate.onrender.com
- For judges (60 seconds): https://quorate.onrender.com/judge
- Repository: https://github.com/0xkinno/quorate

## Testing instructions
Open /judge and press "Run it live, with a PayPal decline" (two to three minutes; each step is a real PayPal
sandbox call). To approve a hold yourself, use "Open a demo slip" and the sandbox buyer printed on /judge.
No login is needed for anything else. Clean clone with no keys: `npm ci && npm test`.

## AI tools used to build, and in the product
Built with help from Claude Code (Anthropic); every commit is authored by 0xkinno. In the product: Google
Gemini through the Vercel AI SDK for reading, writing and the help desk; no model decides an amount or holds a
tool that moves money.

## Video
YouTube link (under 3 minutes): to add.

---

# Video script (under 3:00)

| Time | Picture | Voice |
|---|---|---|
| 0:00 to 0:20 | Landing hero, the slips floating; Ms. Rivera's quote | "Every field trip starts the same way: a teacher pays for the bus on her own card, then chases twenty-six families for weeks. Quorate lets each family's PayPal hold their child's share instead." |
| 0:20 to 0:30 | Title card: Quorate. Group payments without a group payer. | "Nobody is charged until enough kids are going, and every family pays less with each child who joins." |
| 0:30 to 1:15 | Slip on a phone in Spanish; PayPal sandbox approval; The Register row flips to HELD; the price curve | "Each family approves a hold for the worst case, eighty-eight dollars, on PayPal. As children join, the real share falls." |
| 1:15 to 1:55 | Judge door: Run it live, with a PayPal decline; The Register fills; family 7 DECLINED; top-ups; Exact to the cent | "At the close, PayPal declines family seven. Quorate re-shares among nineteen, tops up the families already charged from their own holds, releases the rest, and pays the coach and the museum exactly." |
| 1:55 to 2:25 | Proof page: every id, the attempt log; FINDINGS P3 | "Every PayPal id is on a public proof page. And one finding: PayPal would accept eighty dollars on a seventy-two dollar hold. Quorate refuses." |
| 2:25 to 2:45 | Help desk refusing a refund; the honor timeline | "The help desk reads PayPal through the Agent Toolkit, and cannot move money. Every hold's guarantee is renewed to cover the close." |
| 2:45 to 2:58 | Closing band and the link | "Teachers stop fronting. Families pay less, together. Quorate." |

On screen throughout: "PayPal sandbox. Demo people." The film uses the recorded live run and the phone slip.
