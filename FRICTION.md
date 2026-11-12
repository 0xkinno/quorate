# Developer friction, noted for PayPal

Written neutrally, for the PayPal developer experience team. Each item is something we hit on
12 Nov 2026 in the sandbox, what it cost, and what helped.

1. **`INSTRUMENT_DECLINED` is not a mock code for authorization capture.** With negative testing on,
   `PayPal-Mock-Response: {"mock_application_codes":"INSTRUMENT_DECLINED"}` on
   `POST /v2/payments/authorizations/{id}/capture` returns 403 with an empty body, while
   `PAYER_CANNOT_PAY`, `TRANSACTION_REFUSED`, `AUTHORIZATION_EXPIRED` return 422 with that issue. The
   empty 403 looks like a permissions problem. A 422 naming the unsupported code would save time.
2. **Negative testing off returns the same empty 403.** Before the toggle was on, every mock header
   returned 403 and no body, indistinguishable from item 1.
3. **Over-capture is accepted silently.** A $80.00 capture on a $72.00 authorization succeeded (probe P3).
   That matches the documented 115% or +$75 allowance, but for group purchases where a payer saw an exact
   maximum, an opt-out flag on the order would make "never above what you saw" enforceable at PayPal too.
4. **A sandbox business account outside a payout country restricts holds without saying why.**
   Saved-wallet orders returned `PAYEE_ACCOUNT_RESTRICTED` while plain order creation succeeded.
   Moving the app to a US sandbox business account fixed it.
5. **Payout receivers outside a payout country fail only at the item level.** The batch is accepted as
   PENDING and later becomes DENIED with `RECEIVER_COUNTRY_NOT_ALLOWED`. A validation error at create
   time would surface it earlier.
6. **Vault setup without `usage_pattern`, `customer_type` and `vault_instruction`** sent the buyer to
   "Something went wrong" after login. With them, approval succeeded. The minimal example in the docs
   could include them.
7. **New funds are held before payouts can use them.** Right after captures, a payout returned
   `INSUFFICIENT_FUNDS`; setting a sandbox balance fixed it. Quorate now keeps the families' charges and
   retries the payout instead of failing the close.
8. **Documentation disagrees on reauthorization count.** Some pages say one reauthorization; the Server
   SDK's own description says multiple after the honor period. Quorate renews at most once by policy.

None of these changes the pitch: the two-step authorization is what makes group payments without a group
payer possible.
