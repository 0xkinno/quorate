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

## Answers
Not run yet. Each answer lands here with its date and debug id.
