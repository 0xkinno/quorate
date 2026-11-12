# Platform probe

What each named PayPal service did on our sandbox account, from real calls. Questions were registered
first in `FINDINGS.md`; the answers there carry debug ids and raw files in `docs/probe/`.

| Service | What we called | What happened |
|---|---|---|
| OAuth | `POST /v1/oauth2/token` | Token issued; measured on every `/api/status` request |
| Orders v2 | AUTHORIZE order from a saved wallet | Authorization returned at once, valid 29 days |
| Payments v2 | capture (partial, repeated, over the amount), void, reauthorize, refund | Partial captures and void behave as documented; $80 on $72 accepted; reauthorize too soon refused |
| Negative testing | `PayPal-Mock-Response` on capture, void, reauthorize | Capture honours five codes; `INSTRUMENT_DECLINED` is not one of them |
| Payouts | batch, repeated batch, poll | SUCCESS in 25 s to US receivers; duplicate `sender_batch_id` refused; non-payout-country receivers DENIED |
| Vault v3 | setup token, payment token | Works with `usage_pattern`, `customer_type`, `vault_instruction` |
| Invoicing v2 | create, send without email, record payment, record refund | Cash family counted and its change recorded |
| Webhooks | register, verify | Registered for https://quorate.onrender.com/api/paypal/webhook |
| Agent Toolkit | `get_order`, `get_invoice`, `list_transactions` | `get_order` returns AUTHORIZE orders with their authorization |
| Account setup | business account country | A non-US business account restricted saved-wallet holds; a US one did not |
