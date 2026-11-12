# Thesis

## Five-line pitch
```
NAME:       Quorate
MOMENT:     Ms. Rivera, a 4th grade teacher, at 3:10pm on a Thursday, holding a coach quote that
            says "confirm and pay $1,440 by Friday noon or lose the date", with 11 of 26 slips back.
            Teachers already spend about $895 a year of their own money on their classrooms.
ACTION:     Each family's PayPal holds their child's worst-case share. When enough children are in,
            Quorate charges every family the real, lower share, releases the rest, and pays the
            coach company and the museum in one payout. Nobody fronts a cent.
DISCOVERY:  everyone assumes a group payment needs one person to front it or a pot that collects
            money up front; in reality PayPal's two-step authorization lets every family's share sit
            on hold for up to 29 days, captured in part, renewed, and released, so the price can fall
            as the group grows and nobody is charged if the trip never happens.
PROOF:      live PayPal sandbox closes with real IDs, including closes where PayPal itself declined a
            capture mid-close (sandbox negative testing), each ending with the vendor total exact to
            the cent and no family charged above what they approved.
```

## 20-second hook
"Every field trip starts the same way: a teacher pays for the bus on her own card, then chases
twenty-six families for weeks. Quorate lets each family's PayPal hold their child's share instead.
Nobody is charged until enough kids are going, and every family pays less with each child who joins."

## One sentence
Ms. Rivera confirms the trip without fronting a cent, because PayPal holds each family's share and
charges only the real price once enough children are going.

## X without Y
Group payments without a group payer.

## Primary guarantee
No family is ever charged more than the amount they saw and approved, no family is charged at all if
the trip does not happen, and the vendors receive exactly the quoted total.

## The human loop
- Teacher: confirms the quote the Reader read; approves the close preview; decides when a close cannot
  finish within what families approved.
- Family: approves their own hold on PayPal.
- Office: records cash it physically received.

## The crew
| Role | Kind | Does | Never |
|---|---|---|---|
| Reader | model, no tools | Reads the vendor quote and parent replies into typed JSON | Sees PayPal data or sets amounts |
| Scribe | model | Writes slips and messages in the family's language; code supplies every number | Invents a number |
| Clerk | model | Help desk, with read-only PayPal Agent Toolkit tools | Moves money |
| Bursar | plain code | Allocation, renewals, the close, payouts, refunds | Calls a model |

## Name
Quorate: a meeting with enough people present to decide. A trip is quorate when enough children are
going. A package named "quorate" exists on npm (unrelated, a code review CLI); no payments product uses
the name, so we keep it.
