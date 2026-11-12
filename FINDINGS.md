# Findings: what the PayPal sandbox does

Questions registered on 12 Nov 2026, **before** `scripts/probe.ts` was run. Answers are appended
below each question with the date, the PayPal debug id and the raw response file in `docs/probe/`.
What we expect is written down first so a surprise is visible.

| # | Question | How | Expected |
|---|---|---|---|
| P1 | Does capture with `final_capture:false` leave the rest capturable? | authorize $72, capture $60, capture $5 | Both captures succeed |
| P2 | Does void after a partial capture release the remainder? | authorize $72, capture $60, void | Void succeeds; status becomes CAPTURED or PARTIALLY_CAPTURED with nothing left to take |
| P3 | Does PayPal accept a capture above the authorized amount (115% or +$75)? | authorize $72, capture $80 | Accepted (docs say up to 115% or +$75). Quorate's guard refuses it regardless |
| P4 | Is reauthorize refused inside the honor period, and with which issue code? | reauthorize immediately | Refused with an issue code naming the honor period |
| P5 | Which `mock_application_codes` work on capture, reauthorize and void? | INSTRUMENT_DECLINED, AUTHORIZATION_EXPIRED, AUTHORIZATION_VOIDED, PAYER_CANNOT_PAY, MAX_CAPTURE_AMOUNT_EXCEEDED | Each returns a 422 with that issue |
| P6 | Same `PayPal-Request-Id` on capture twice: is the same capture returned? | repeat the call | Same capture id, no second capture |
| P7 | Payouts batch with a repeated `sender_batch_id` | repeat the call | Refused as a duplicate batch |
| P8 | Time from capture to the `PAYMENT.CAPTURE.COMPLETED` webhook; time to payout SUCCESS | measure | Seconds for the webhook; under a few minutes for the payout |
| P9 | `expiration_time` on a fresh authorization: does it say 29 days? | read back | 29 days after creation |
| P10 | Does the Agent Toolkit `get_order` return authorization details for an AUTHORIZE order? | call | Returns the order with its authorization |

## Note from the SDK before probing
The PayPal Server SDK's own description of `reauthorizePayment` says: within the 29-day authorization
period, multiple reauthorizations may be issued after the honor period expires, and a reauthorized
payment has a new 3-day honor period. Some PayPal pages say one. Quorate renews at most once per hold
by policy, whatever P4 shows.

## Answers (run 12 Nov 2026, 05:47 UTC, raw file `docs/probe/2026-11-12-probe.json`)

| # | Answer | Debug id | Matched what we expected? |
|---|---|---|---|
| P1 | Yes. $60.00 then $5.00 captured from one $72.00 hold with `final_capture:false`; the hold reads PARTIALLY_CAPTURED | ca5933e03dfc5, ca5933e129a0d | Yes |
| P2 | Yes. Void after a $60.00 partial capture returns 204 and the hold reads VOIDED; the $12.00 remainder is released | ca5933e411839 | Yes |
| P3 | **PayPal accepted an $80.00 capture on a $72.00 hold.** Quorate's guard refuses it (`assertWithinCap`, tests/renewal-guards.test.ts) | ca5933e598b87 | Yes, and it is why the guard exists |
| P4 | Reauthorize at once is refused: 422 `REAUTHORIZATION_TOO_SOON` | ca5933e7aec6b | Yes |
| P5 | Not answered yet: the mock header returned 403 with an empty body, because negative testing was off on the merchant sandbox account. Re-run after switching it on | ca5933e8a9ed5 | Pending |
| P6 | Same `PayPal-Request-Id` twice returns the same capture `3R920997RY101924L`; no second capture | ca5933f090bcf | Yes |
| P7 | A repeated `sender_batch_id` is refused: 400 "Batch with given sender_batch_id already exists" | ca5933f14fbc8 | Yes |
| P8 | Payout batch reached a final status in 25 seconds, but DENIED: `RECEIVER_COUNTRY_NOT_ALLOWED` (the receiving sandbox account was not in a payout country). Re-run with US receivers | batch 8CWT4BYTTGJ4G | Timing yes; receiver setup was ours |
| P9 | A fresh authorization created 12 Nov 05:47 UTC expires 11 Dec 05:47 UTC: 29 days | order 3J6876502H653035S | Yes |
| P10 | Not run yet | | Pending |

### Two account findings on the way (recorded in FRICTION.md)
- A sandbox business account whose holds come back `PAYEE_ACCOUNT_RESTRICTED` on saved-wallet orders, while plain order creation still succeeds. Moving the app to a US sandbox business account fixed it.
- A Vault setup token without `usage_pattern`, `customer_type` and `vault_instruction` led the buyer to "Something went wrong" on approval. With them, approval succeeded.
