# Proof plan

| Claim | External truth | Control | Result file |
|---|---|---|---|
| The close is exact to the cent | PayPal's own capture, refund and payout ids | Reconciliation throws on a one-cent difference | `docs/live-runs/*.json`, `docs/FACTS.json` |
| It survives PayPal declining a capture | `PAYER_CANNOT_PAY` injected by PayPal (negative testing), not by our code | Same run without the decline (L1) | L3 run |
| A crash does not double-capture | PayPal returns the original capture for a repeated request id (P6) | The process is killed after the 9th capture, then restarted | L6 run |
| Nobody pays above their approved amount | PayPal would accept 115% (P3) | `assertWithinCap` before every capture; 10,000-case properties | `tests/allocate.test.ts`, probe file |
| Nobody pays if the trip does not run | Voided authorizations | 15 of 18 needed | L2 run |
| Sponsors pay only the gap | Captured amounts per member | Two low caps | L4 run |
| Cancel refunds exactly | Refund ids per capture | Teacher cancels after a decline drops below the minimum | L5 run |
| Cash families count | PayPal invoice with a recorded payment and refund | One of 20 pays cash | L7 run |
| The help agent cannot move money | The toolkit tools it holds | Test enumerates them | `tests/crew.test.ts`, probe P10 |
| A misbehaving model cannot raise a cap | Reply asking to be charged $500 | Obedient-model fixture and live Gemini | `tests/crew.test.ts`, `docs/crew-run.json` |
| Outcomes vs the alternatives | Seeded model using the Bursar's own code | Teacher fronts, pot up front | `docs/counterfactual.json` (labelled a model) |

Both directions: a close wrongly blocked would show as NEEDS_TEACHER with enough held; a close that should
have stopped would show as CLOSED below the minimum or above a cap. In the recorded runs neither happened:
every NEEDS_TEACHER had fewer children than the minimum, and every CLOSED had 0 families above their cap.
