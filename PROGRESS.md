# Progress

## 12 Nov 2026 (WAT)

### Done and verified
- Repository, authorship gate, planning documents; references only in gitignored `reference/` (task list kept there too).
- The Bursar: allocation (six properties, 10,000 cases each), renewal and hold-or-vault planner, cap and terms
  guards, attempt log, the close (decline, top-ups, cancel, crash restart, cash families), payouts with retry.
- PayPal: probe P1 to P10 answered; 13 live sandbox runs recorded (L1 to L8 and the team-bus template), 9 of 9
  closes exact to the cent, 8 payouts SUCCESS, 0 families above their approved amount.
- Crew live on Gemini: Reader with quote checks, Scribe in three languages with number checks, Clerk with
  read-only Agent Toolkit tools; template fallback when the model is busy or unavailable.
- UI: landing with motion (word reveals, count-ups, close reel, price bars, marquee), judge door with an aligned
  runs table, The Register (AG Grid, AG Charts), slip in three languages, proof ledger, Bryntum honor timeline,
  help desk, guided tour, MCP door.
- Checks: 32 unit and property tests; six-viewport layout and axe (0 violations); nine end-to-end flows in Chromium.
- Deployed at https://quorate.onrender.com (web, cron, Postgres from one Blueprint); recorded runs seeded.

### Waiting on Kinnoski
- In Render's environment: `GEMINI_API_KEY` (the new key), `PAYPAL_WEBHOOK_ID=0VF35856UV734571V`,
  `PUBLIC_BASE_URL=https://quorate.onrender.com`.
- Devpost criteria sentences, the demo video link, and the go-ahead to submit.

### Self-judge (0 to 10)
| Criterion | Score | Why |
|---|---|---|
| Technological Implementation | 9 | Multi-hold close live on the sandbox with PayPal-injected declines, crash restart, cash and vault paths; probe published |
| Design | 8 | Coherent paper-and-stamp system, motion on the landing, aligned ledgers, 0 axe violations at six viewports |
| Potential Impact | 8 | Sourced teacher spending; second domain on the same engine |
| Innovation/Idea | 9 | One purchase for many payers with a falling price, sponsors for the gap, exact under declines |
| Presentation | 8 | 60-second judge path, live decline on screen, proof pages, README numbers generated from runs |
