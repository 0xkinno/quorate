# PayPal plan: every SDK method and field Quorate uses

Looked up in the installed PayPal Server SDK's type definitions
(`node_modules/@paypal/paypal-server-sdk/dist/esm/types/controllers/*.d.ts`, version 2.5). The APIMatic
Context Plugin was not installed for this build, so no plugin claim is made.

## Client
`new Client({ clientCredentialsAuthCredentials, timeout: 30000, environment: Environment.Sandbox, httpClientOptions: { retryConfig: { maxNumberOfRetries: 0 } } })`,
one per call (`src/paypal/live.ts:18`). SDK retries are off because the attempt log owns retries and
reconciliation; a silent SDK retry would be a second call the log never saw.

## OrdersController
| Method | Fields used | Where |
|---|---|---|
| `createOrder` | `body.intent = CheckoutPaymentIntent.Authorize`; `purchaseUnits[].referenceId, customId (terms hash), invoiceId, description, amount.currencyCode/value`; `paymentSource.paypal.experienceContext.shippingPreference, brandName, userAction`; `paypalRequestId`; `prefer: return=representation` | `src/paypal/live.ts:43` |
| `authorizeOrder` | `id`, `paypalRequestId`, `prefer`; reads `purchaseUnits[0].payments.authorizations[0].id, status, expirationTime, amount.value` | `src/paypal/live.ts:63` |

## PaymentsController
| Method | Fields used | Where |
|---|---|---|
| `getAuthorizedPayment` | `authorizationId`; reads `status, amount.value, expirationTime` | `src/paypal/live.ts:82` |
| `captureAuthorizedPayment` | `authorizationId, paypalRequestId, paypalMockResponse, prefer`; `body.amount, finalCapture, invoiceId` | `src/paypal/live.ts:90` |
| `voidPayment` | `authorizationId, paypalRequestId, paypalMockResponse` | `src/paypal/live.ts:101` |
| `refundCapturedPayment` | `captureId, paypalRequestId, prefer, body.amount` | `src/paypal/live.ts:106` |
| `reauthorizePayment` | `authorizationId, paypalRequestId, prefer, body.amount` | `src/paypal/live.ts:72` |

## REST, not in the SDK
Payouts (`POST /v1/payments/payouts`, `GET /v1/payments/payouts/{id}`), webhook verification
(`POST /v1/notifications/verify-webhook-signature`), webhook registration, Vault v3 setup and payment
tokens, Invoicing v2 (create, send, payments, refunds), and the saved-wallet AUTHORIZE order:
`src/paypal/rest.ts`, `src/paypal/cardhold.ts`, `src/paypal/invoicing.ts`, `scripts/vault-setup.ts`.

## What the SDK's own docs changed
- The `reauthorizePayment` description says multiple reauthorizations are allowed after the honor period.
  Some PayPal pages say one. Quorate kept a policy of one renewal per hold (`src/bursar/renewal.ts`).
- `paypalMockResponse` is a typed parameter on capture and void, so the decline switch needs no raw header code.
