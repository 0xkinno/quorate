# Risk

| Risk | Parameter stricter than PayPal | Where |
|---|---|---|
| A family charged above what they saw | Never above the approved cap, though PayPal accepts 115% or +$75 | `src/bursar/guards.ts:4` |
| Terms changed after a family approved | The close refuses a member whose approved terms hash differs | `src/bursar/guards.ts:26` |
| Rounding | Integer cents only; remainder cents to members in join order, one each, never above a cap; floats refused | `src/bursar/allocate.ts:29` |
| A hold expiring before the close | Renew once at max(t0 + 3 days, close - 3 days); past 29 days, flag CANNOT_REACH_CLOSE | `src/bursar/renewal.ts:15` |
| Double capture after a crash | Attempt row before every call; same PayPal-Request-Id on resend (P6); different payload held for the teacher | `src/bursar/attempts.ts:44` |
| A decline mid-close | Re-share among the rest; top up from the same holds; below the minimum, the teacher decides | `src/bursar/close.ts:65` |
| Vendors underpaid or overpaid | The close throws if charged differs from due by one cent; the payout uses the computed total | `src/bursar/close.ts` (reconcile) |
| A model moving money | Clerk has three read-only toolkit tools; construction throws on any money tool; tested | `src/crew/clerk.ts:18`, `tests/crew.test.ts` |
| A model inventing a number | Reader values kept only if quoted from the source; Scribe text rejected if it carries a number code did not supply | `src/crew/reader.ts:27`, `src/crew/slip.ts:37` |
| A public link spending the budget | Live runs capped per day; kill switch `QUORATE_LIVE=off`; help desk rate-limited per visitor | `src/pool/service.ts`, `app/api/help/route.ts` |

Maximum loss per family: their approved amount, $88.00 in the demo. Maximum loss to the teacher: $0.
