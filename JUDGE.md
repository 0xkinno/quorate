# For judges

Live: **https://quorate.onrender.com** (no login). Everything runs on the PayPal sandbox; no real money moves.

## 60 seconds
1. Open https://quorate.onrender.com/judge.
2. Press **Run it live, with a PayPal decline**. Twenty demo families each hold $88.00 on the PayPal
   sandbox, then the close runs. PayPal is told (sandbox negative testing) to refuse family 7.
3. The Register opens and fills as it happens: family 7 turns DECLINED, the share is re-computed for 19,
   the six families already captured get a $3.79 top-up from their own holds, every remainder is
   voided, and the box on the right reads **Exact to the cent** with the payout batch id.
   A run takes about two to three minutes because each step is a real PayPal call.

No time to wait? Open any **Recorded runs** row on /judge: the register and the proof page show the same
run with every PayPal id.

## 3 minutes
- **Approve a hold yourself.** On /judge, step 2 prints a PayPal sandbox buyer. Open the class register,
  pick a row marked "Open slip", switch the slip to Spanish or Vietnamese if you like, press the PayPal
  button and approve. Back on the register the row turns HELD with its "guaranteed until" time.
- **Check the proof.** Each run's `/proof/<pool>` page lists every authorization, capture, refund and
  payout id, and the attempt log that was written before each PayPal call.
- **Ask the help desk.** /help: "Can you refund me $20 now?" The Clerk explains it cannot; only the
  teacher decides money.

## 10 minutes
- Read the close: `src/bursar/close.ts:65`; the money rule: `src/bursar/allocate.ts:29`.
- Read what the sandbox actually did: `FINDINGS.md` (P1 to P10, with debug ids).
- Reproduce the numbers with no keys: `npm ci && npm test` (allocation properties at 10,000 cases each,
  the close against the PayPal stand-in, the crew checks, the house style), then `npx tsx scripts/facts.ts`.
- `GET /api/status` shows measured health (PayPal token, Postgres, model) with timestamps.
- `GET /api/stats` shows the recorded headline numbers next to this deployment's own runs.

## Limits you may see
- Live runs are capped per day (`LIVE_MAX_CLOSES_PER_DAY`); when reached, open a recorded run.
- The help desk uses Gemini; if the model's quota is exhausted it answers from the trip's facts and
  says so ("template answer").
