# TASK.md

Ticked only when done and verified. Deadline: Thu 12 Nov 2026, 9:00pm WAT (submit by 7:00pm WAT).

### Phase 0. Repo, authorship, references
- [x] `git init`; `git config user.name "0xkinno"`; GitHub noreply email `140649226+0xkinno@users.noreply.github.com`
- [x] Project `.claude/settings.json`: `{"attribution":{"commit":"","pr":"","sessionUrl":false}}`
- [x] `.githooks/commit-msg` rejecting AI attribution; `git config core.hooksPath .githooks`
- [x] `.github/workflows/no-claude-attribution.yml` (regex fixed, runs on push)
- [x] `.gitignore` includes `reference/`, `.env*`, `node_modules`, `.next`
- [x] References cloned into `reference/`; both instruction files live only in `reference/` (never committed)
- [x] Name collision check (npm "quorate" is an unrelated code review CLI; kept); `LICENSE` (MIT); first commit
- [x] Public GitHub repo `0xkinno/quorate`, pushed (licence detected from `LICENSE`)
- [x] `RULES_EXTRACT.md`, `LANE_MAP.md`, `SPONSOR_INTEL.md`, `MOMENT.md`, `THESIS.md`
- [ ] Copy each criterion's full sentence from the Devpost page into `RULES_EXTRACT.md` (needs the Devpost page)

### Phase 1. Deploy empty at the final URL
- [x] Next.js skeleton, `/api/live`, `/api/status` (measured), Render Blueprint, Postgres, cron
- [x] Deployed at https://quorate.onrender.com; status measured PayPal token, Postgres and model live

### Phase 2. Probe PayPal (FINDINGS first)
- [x] Pre-registered `FINDINGS.md` questions P1 to P10 committed before any sandbox call
- [x] `scripts/probe.ts` and `scripts/p10.ts`; raw files in `docs/probe/`; dated answers P1 to P10
- [x] Guards and scheduler match what the sandbox did (over-capture refused; one renewal after the honor period; decline code `PAYER_CANNOT_PAY`)

### Phase 3. The Bursar
- [x] `allocate.ts` + property tests (6 properties, 10,000 cases each)
- [x] `renewal.ts` + tests (honor, validity, cannot-reach-close)
- [x] `guards.ts` (cap, terms hash) + tests
- [x] `close.ts` saga: attempts log, read-back, top-ups, void, cancel path, crash reconcile, cash families; tests against the stand-in and a scripted failing PayPal
- [x] Payouts batch inside the close; poll in the tick; retry for refused batches

### Phase 4. PayPal paths live
- [x] Order create (AUTHORIZE) and authorize routes; slip approval with JS SDK Buttons `intent=authorize` (v5, labelled in SDK_SURFACE.md)
- [x] Webhook route with verification and dedupe; webhook registered for the Render URL
- [ ] `PAYPAL_WEBHOOK_ID` and `PUBLIC_BASE_URL` set in Render's environment (Kinnoski), then webhook timing measured (P8 second half)
- [x] `tick.ts`: renewal, lapse, close start, payout polling (ran locally against the sandbox)
- [x] Invoicing for cash families (create, send, record-payment, record-refund), live in L7

### Phase 5. The crew
- [x] Reader (quote + replies) with quote-in-source check and REVIEW
- [x] Scribe (notes in en/es/vi) with `numbersMatch`; slip templates in three languages
- [x] Clerk with Agent Toolkit read-only tools + allowlist test
- [x] Replay mode and misbehaving-model fixtures; live Gemini run recorded (`docs/crew-run.json`)

### Phase 6. Proof
- [x] Live closes L1 to L7 recorded to `docs/live-runs/` (plus repeats and two failed runs, kept)
- [x] Counterfactual script (labelled a model)
- [x] `facts.ts` -> `docs/FACTS.json`; CI drift check; `/api/stats` serves recorded and live numbers
- [x] Cost per pool measured in tokens (4,471 in, 16,403 out); dollar price not claimed

### Phase 7. UI
- [x] `DESIGN.md`; fonts; tokens; mark SVG; hero art SVG
- [x] Landing with hover-glow cards and the ring motion
- [x] `/register` with AG Grid theme, renderers, pinned totals, flash, CSV, quick filters, AG Charts curve, close log, payout
- [ ] "Ask the register" (question to AG Grid filter model): not built, not claimed
- [x] `/slip/[token]` phone-first, three languages, PayPal button
- [x] `/judge`, `/proof/[poolId]`, `/help`, guided tour
- [x] Playwright layout + axe across 6 viewports: green; screenshots saved

### Phase 8. Presentation
- [x] Diagrams (roughjs) to PNG; banner; 2x2 screenshots; decline GIF from a live run
- [x] README from FACTS; `JUDGE.md`, `EVIDENCE.md`, `SDK_SURFACE.md`, `DISCLOSURES.md`, `FRICTION.md`, `MILESTONES.md`, `paypal-plan.md`, `DISCOVERY.md`, `RISK.md`, `PROOF_PLAN.md`, `PLATFORM_PROBE.md`
- [x] House-style test passes on README, app and docs
- [ ] Red team on the deployed URL; fix; re-run until clean
- [ ] `SUBMISSION_DEVPOST.md`; video script

### Phase 9. Depth extensions
- [ ] MCP door `/api/mcp`: `pool_status`, `slip_link`
- [ ] Bryntum Scheduler timeline of honor windows and renewals
- [ ] Vault path for trips more than 26 days out
- [ ] Second template (team tournament bus) on the same engine

### Phase 10. Freeze
- [ ] Tag `v1.0-submission`; freeze deployment; record the commit in `PROGRESS.md`
