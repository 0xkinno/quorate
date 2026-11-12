# Sponsor intel

## PayPal's thesis
- Agentic commerce: Agent Toolkit, remote MCP server, agentic commerce services.
  https://docs.paypal.ai/ , https://developer.paypal.com/ai-tools/get-started ,
  https://developer.paypal.com/ai-tools/toolkit , https://github.com/paypal/agent-toolkit
- Group money: PayPal closed Money Pools in 2021
  (https://newsroom.uk.paypal-corp.com/evolving-the-ways-you-can-collect-and-raise-money ).
  A 2024 relaunch is cited only once a PayPal newsroom page confirms it.

## The primitive and its depth
| Primitive | Common use | Deep use | Quorate |
|---|---|---|---|
| Orders v2 | `intent: CAPTURE` | `intent: AUTHORIZE`, `custom_id`, `invoice_id`, `reference_id`, `PayPal-Request-Id` | AUTHORIZE per family at the worst-case share; terms hash in `custom_id` |
| Payments v2 authorizations | capture in full | partial capture with `final_capture:false`, second capture, void of the remainder, reauthorize timed to the honor window, read-back before each step | All of it, in the close |
| Honor period | ignored | 3-day honor vs 29-day validity; reauthorize restarts honor | Renewal scheduler and the "guaranteed until" column |
| Over-capture (115% or +$75) | unknown | probe it | Probed and refused in our code |
| Sandbox negative testing | unused | `PayPal-Mock-Response` header | The fault switch: PayPal's own failure, not ours |
| Payouts | single payout | batch with `sender_batch_id`, item status | Coach and museum paid in one batch |
| Webhooks | logged | `verify-webhook-signature`, dedupe, event mapping | Verified, deduplicated, reconciled |
| Refunds | n/a | compensation | Only when a close is cancelled after partial captures |
| Invoicing | send invoice | `record-payment`, `record-refund` | Cash families counted in PayPal's ledger |
| Agent Toolkit | every tool to the model | allowlisted read-only tools | Clerk reads orders, invoices, transactions only |
| JS SDK v6 | v5 buttons | v6 payment session | Family approval on the slip (v5 labelled fallback if v6 refuses AUTHORIZE) |
| Server SDK | raw fetch | `@paypal/paypal-server-sdk` controllers | Orders and Payments through the SDK; Payouts and webhook verify through REST |

## Facts from PayPal docs
- "An authorization places a hold on the funds and is valid for 29 days."
  https://developer.paypal.com/docs/checkout/standard/customize/authorization-honor/
- Reauthorization generates a new authorization ID and restarts the honor period. Same page.
- Partial capture: you can capture less than or the full original authorized amount. Same page.
- Capture up to 115% of the original authorization or $75 more, whichever is less:
  https://developer.paypal.com/limited-release/commerce-platform/v2/payment/authorize-capture/
- Docs disagree on the number of reauthorizations allowed. We probe it (FINDINGS.md).
