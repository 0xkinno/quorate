# SDK surface

Every PayPal product Quorate names, where it is called, and whether it ran live. "Live" means it was
called against the PayPal sandbox on 12 Nov 2026 and the result is in `docs/live-runs/` or
`docs/probe/`. Package versions are from `package.json`.

## PayPal

| Feature | Where | How it is used | Status |
|---|---|---|---|
| Orders v2 `intent: AUTHORIZE` | `src/paypal/live.ts:43` (Server SDK `createOrder`), `src/paypal/cardhold.ts:19` (REST) | One order per family at the worst-case share; terms hash in `custom_id`, `invoice_id` per member, `PayPal-Request-Id` on every create | Live |
| Orders v2 authorize | `src/paypal/live.ts:63` (`authorizeOrder`) | After the family approves on the slip, the server authorizes the order and records the hold | Live in code; the slip path needs a buyer login, see JUDGE.md step 2 |
| Payments v2 get authorization | `src/paypal/live.ts:82` | Read back every hold before the close; expired or voided holds drop out (`src/bursar/close.ts:58` retries network blips) | Live |
| Payments v2 capture, `final_capture:false` | `src/paypal/live.ts:90`, called from `src/bursar/close.ts:120` area | Each share captured in join order; top-ups after a decline come from the same authorization | Live |
| Payments v2 void | `src/paypal/live.ts:101` | Releases the remainder after a partial capture (probe P2) and every hold of a lapsed or cancelled trip | Live |
| Payments v2 reauthorize | `src/paypal/live.ts:72`, called by `scripts/tick.ts` | Renews a hold so its new 3-day honor window covers the close (`src/bursar/renewal.ts:15`) | Live probe (P4: `REAUTHORIZATION_TOO_SOON` inside the honor period); the scheduled renewal runs on day 3 or later, after this event |
| Payments v2 refund | `src/paypal/live.ts:106` | Compensation only: a share that fell after capture, or every capture when the teacher cancels | Live (L5: every capture refunded exactly) |
| Vault v3 setup token and payment token | `scripts/vault-setup.ts` | One sandbox buyer saved their PayPal wallet once (`usage_pattern: UNSCHEDULED_POSTPAID`); scripted runs place each hold from it with `stored_credential` | Live |
| Payouts | `src/paypal/rest.ts:42` | One batch per close: the coach's fixed price and the museum's per-child total; `sender_batch_id = pool:<id>:close:<n>` | Live (4 batches SUCCESS) |
| Webhooks: verify signature | `src/paypal/rest.ts:55`, `app/api/paypal/webhook/route.ts` | Accepted only after `verify-webhook-signature` returns SUCCESS; duplicates ignored by `transmission_id` | Registered for the Render URL (`scripts/register-webhook.ts`) |
| Invoicing: create, send, record-payment, record-refund | `src/paypal/invoicing.ts:10`, `:23`, `:30` | A family that pays cash is counted on a PayPal invoice; the change due at the close is recorded as a refund on the same invoice | Live (L7) |
| Sandbox negative testing (`PayPal-Mock-Response`) | `src/paypal/types.ts:33`, `src/paypal/live.ts:41` | The judge's decline button: PayPal itself refuses family 7's capture with `PAYER_CANNOT_PAY` | Live (L3); probe P5 lists which codes each call honours |
| JS SDK Buttons, `intent=authorize` | `app/slip/[token]/SlipActions.tsx:33` | The family slip: order created by our server, approved by the family on PayPal, authorized by our server | Live in code; v5 Buttons, see "not used" |
| PayPal Server SDK (APIMatic) `@paypal/paypal-server-sdk` 2.5 | `src/paypal/live.ts:18` | OrdersController and PaymentsController, one client per call, 30 s timeout, SDK retries off (our attempt log owns retries) | Live |
| PayPal Agent Toolkit `@paypal/agent-toolkit` 1.11 | `src/crew/clerk.ts:13`, `:18` | The Clerk gets exactly `get_order`, `get_invoice`, `list_transactions`; construction throws on any money tool | Live (probe P10: `get_order` returns the AUTHORIZE order with its authorization) |

## Other sponsors

| Feature | Where | Status |
|---|---|---|
| AG Grid Community 36, Theming API | `app/register/RegisterView.tsx` | Live: themed from Quorate's tokens, custom renderers (honor countdown, PayPal id chips, stamps), pinned totals row, cell flash, quick filter tabs, CSV export, row selection |
| AG Charts Community 14 | `app/register/RegisterView.tsx` | Live: price per child against children going |
| Render (web service, cron job, Postgres) | `render.yaml` | Live at https://quorate.onrender.com; measured health at `/api/status` |
| Gemini (`gemini-3-flash-preview`, AI SDK 7) | `src/crew/model.ts` | Live: Reader, Scribe, Clerk (`docs/crew-run.json`) |

## Not used, so not claimed
- JS SDK v6. The slip uses v5 Buttons with `intent=authorize`, which is documented for authorize-then-capture. v6 was not tried in the time available.
- Transaction Search. The Clerk reads transactions through the Agent Toolkit's `list_transactions`; Quorate does not call Transaction Search itself.
- Subscriptions, disputes, Bryntum. Not in this build.
- The "Ask the register" box that turns a question into an AG Grid filter is not built.
