# Discovery

## The assumption
A group payment needs a group payer: one person fronts the money, or a pot collects it up front. Both
move money before anyone knows whether the purchase will happen or what it will really cost per person.

## The primitive
PayPal's two-step payment: an AUTHORIZE order places a hold that is valid for 29 days (probe P9), can be
captured in part with `final_capture:false` and captured again (P1), and whose remainder is released by
a void (P2). Reauthorizing restarts a 3-day honor period, and is refused inside it (P4).

## What that makes possible
If every family's share sits on its own hold, the purchase can wait for the group. The price can fall as
the group grows, because each family approved the worst case and is charged only the real share. If the
trip never runs, nobody is charged: the holds are voided, not refunded.

## The delete test
Remove PayPal's two-step payment and Quorate is a spreadsheet and a cash envelope again. Every property
in the primary guarantee depends on the hold.

## The contradiction we had to solve
A close captures many holds in sequence. Any one can fail. If PayPal refuses family 7 after families 1 to 6
were already charged $80.00, the real share for 19 families is $83.79. Charging the six again would need a
new approval; refunding and re-charging would double the money movement. Because every capture used
`final_capture:false`, the six can be topped up by $3.79 from their own holds, still under the $88.00 each
approved. This ran live on 12 Nov 2026 with PayPal's own decline (sandbox negative testing).

## The surprise
PayPal accepted a capture of $80.00 on a $72.00 hold (P3), as its 115% rule allows. A family that saw
"never more than $88.00" must never pay more, so Quorate refuses before every capture
(`assertWithinCap`, `src/bursar/guards.ts:4`).
