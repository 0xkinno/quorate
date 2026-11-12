# Red team log

Five fresh judge agents, each with no prior context, on 12 Nov 2026: rubric, ten-minute, sponsor maintainer
(PayPal engineer), verifier (clean-clone reproduction) and skeptic (guarantee breaker). They used only the
deployed site, the repository and the submission text. None started a live run.

## Round 1 scores (1 to 5)
| Judge | Tech | Design | Impact | Innovation | Presentation |
|---|---|---|---|---|---|
| Rubric | 4 | 4 | 3 | 4 | 3 |
| Ten-minute | 5 | 4 | 4 | 5 | 4 |
| Sponsor maintainer | 4 | | | | |
| Verifier | every headline number reproduced from a clean copy with no keys; `npm test`, `facts --check` and the counterfactual all passed | | | | |
| Skeptic | defects only, by design | | | | |

## Defects and what was done

### Money safety (fixed in code, with tests)
| Defect (who found it) | Fix | Proof |
|---|---|---|
| A hold PayPal reports as already part-captured could be captured again if the attempt log were lost; read-back hard-coded captured as 0 (maintainer, skeptic) | Such a hold goes to the teacher unless Quorate's own log knows those captures; a fully captured hold too | `src/bursar/close.ts` read-back; test "refuses a hold PayPal shows as already part-captured" |
| Any PayPal error was treated as a family declining (401, 429, 5xx, empty 403) (maintainer) | Only a 422 business refusal is a decline; anything else stops the close, leaves the attempt open, and resumes with the same request id | `close.ts`, `attempts.ts`; test "treats only a 422 refusal as a decline" |
| A decline below the minimum at close time left captures standing until a person acted (skeptic) | At close time the tick cancels: every capture refunded, every hold voided | `scripts/tick.ts` |
| Overlapping ticks could close the same pool (skeptic) | The tick claims the pool (OPEN to CLOSING) before closing; held counts children only | `scripts/tick.ts` |
| Cash counted without checking PayPal, and included in a payout it never funded (maintainer, skeptic) | Cash counts only after the invoice is confirmed paid; the payout carries only money PayPal collected, the office hands over the cash | `close.ts`; tests "pays vendors only what PayPal collected", "does not count a cash family whose invoice PayPal does not show as paid" |
| A PENDING capture counted as money taken before the payout (maintainer, skeptic) | The payout waits until every capture completes | `close.ts` |
| One run charged families and never paid vendors (payout refused before retries existed); the first run's payout was DENIED (verifier, rubric) | Both settled: the first rebuilt from its own attempt log and paid ($1,592.00, batch J9ZRU5MQF5KLL); the second paid to the same vendors' US accounts (batch 9NMU3Q6C6TJDU). Both SUCCESS | `scripts/settle-run.ts`, `docs/live-runs/` |

### Exposure (fixed)
| Defect | Fix |
|---|---|
| The MCP door's `slip_link` returned every family's slip token, with links on the wrong host (skeptic) | Replaced by `slip_status` (state and maximum only, never the link); links use `PUBLIC_BASE_URL` |
| The authorize route accepted any order, on any slip state, after the close (skeptic) | The order's `reference_id` must be this family's; the slip must be unused; the trip must be open and before its close time. Order creation checks the same |
| Help desk and quote reader parsed bodies unguarded; quote reader had no rate limit (skeptic) | Guarded bodies; quote reader limited per visitor per day |
| "Every call goes to the sandbox" was configuration, not enforced (skeptic) | A non-sandbox `PAYPAL_API_BASE` is refused with `SANDBOX_ONLY` |
| The Clerk's guard was a deny pattern (rubric) | Exact allow-list of three tool names first, the money pattern second; tested |

### Claims and documents (fixed)
| Defect | Fix |
|---|---|
| `TRANSACTION_REFUSED` claimed without a raw file (maintainer) | Re-probed live and saved: `docs/probe/2026-11-12-10-01-p5b.json` (422, debug f506866eb214e) |
| FINDINGS cited one raw file for answers from three; P10 marked pending; P8 webhook timing marked answered (maintainer, rubric) | Every answer names its file; P10 answered; webhook timing marked not measured |
| "Teacher approves the close" with no such control; a `CANCELLED` state that does not exist (skeptic) | README says the teacher sets the close time and decides only when a close cannot finish; states match the code |
| Hold counts defined three ways (205 / 226 / 246) (verifier, ten-minute) | One rule everywhere (a real hold is a PayPal authorization); EVIDENCE and `/api/stats` use it; `/api/stats` carries a note on what "this deployment" counts |
| Landing counters rendered 0 without JavaScript (rubric, ten-minute) | The real number is rendered on the server; the count-up only replays it |
| Model status was "configured", not measured (rubric) | A real one-word model call, cached ten minutes |
| "Every step below is a real PayPal call", "nothing needs a login" next to a sandbox login (rubric) | Reworded on /judge |
| Quorate's zeros in the counterfactual read as measured (verifier) | README says they hold by design; only "above the final share" is checked by the model |
| Stale line reference `service.ts:117`; script names without extensions (ten-minute) | Fixed |

### Answered, not changed
- The scripted live runs place holds from one sandbox buyer's saved wallet (approved once by a person); the
  family-slip path needs a PayPal login per hold. Stated on every run, in the README and on /judge. A judge can
  approve one themselves with the printed sandbox buyer.
- The decline is PayPal's sandbox negative testing, and is labelled so everywhere; the four decline runs are one
  scenario repeated, and the README says so.
- A successful live reauthorize needs the 3-day honor period to pass; P4 shows the refusal inside it. The timeline
  draws the renewal from the plan the tick runs, and says so.
- The sandbox buyer password on /judge is a sandbox-only test value, printed on purpose for judges.
- "Exact" is the close's own reconciliation of PayPal's capture and refund results against what vendors are due;
  every capture, refund and payout id is on the proof pages for anyone to check against PayPal.

## Re-check after fixes
39 of 39 unit and property tests, house style clean, FACTS check clean; layout and axe at six viewports and ten
end-to-end flows in Chromium, locally and against the deployed URL.
