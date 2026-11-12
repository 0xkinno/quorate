# Design

## World
A school letter, a permission slip, a rubber stamp, a register. Calm, warm, exact. The family should
feel the same certainty a signed paper slip gives, with the number printed on it.

## Tokens (app/globals.css)
| Token | Hex | Role |
|---|---|---|
| Paper | `#F2F0EB` | page, with a faint grain and a warm-to-cool lustre |
| Ink | `#16181D` | text and rules |
| Held | `#3355FF` | a hold; the one accent per view, with a soft glow |
| Settled | `#0D8A60` | captured exactly (darkened from the brief's `#10A673` to pass AA contrast) |
| Released | `#6B707A` | voided or returned (darkened from `#8A8F98` for AA) |
| Review | `#B9741A` | needs a person (darkened from `#E8A33D` for AA) |

## Type
Sentient (display), Switzer (body), JetBrains Mono (every money figure, tabular). Never Inter.

## Mark
A ring made of separate arcs that close when enough are present: a quorum. One arc is Held blue.
On the landing hero the arcs arrive one by one and the ring closes; under reduced motion it is static.

## Ornament
Hairline rules, tracked small-caps labels, numbered sections, stamp-style status pills
(HELD, SETTLED, RELEASED, DECLINED, REVIEW). Cards lift 4 px and a radial glow follows the cursor.

## Screens
- `/` landing: the moment, how it works, the falling price, the live close, three refusals, measured numbers.
- `/judge`: numbered path, live run buttons, sandbox buyer, recorded runs.
- `/register`: AG Grid themed from the tokens (honor countdown bar, PayPal id chips, stamps, pinned totals
  that must reconcile, cell flash, quick filters, CSV for the school office), AG Charts price curve, the
  close log as it happens, the payout batch.
- `/slip/[token]`: phone first, English, Spanish, Vietnamese; the amount held, the promise, the PayPal button,
  then a HELD stamp with its guarantee date.
- `/proof/[pool]`: every PayPal id, the attempt log, verified webhooks.
- `/help`: the Clerk and the Reader.
- Guided tour (nav, "Tour"): six steps, spotlight, Space and arrow keys, Esc; `?tour=1&render=1` for recording.

## Checks
`tests/e2e/layout.spec.ts`: six viewports (390, 412, 768, 1280, 1536, 1920), no horizontal scroll, the hero
copy never overlaps the art, zero console errors, zero axe-core violations on WCAG 2.2 AA tags.
Screenshots in `docs/images/screens/`.
