# TASK.md

Ticked only when done and verified. Deadline: Thu 12 Nov 2026, 9:00pm WAT (submit by 7:00pm WAT).

### Phase 0. Repo, authorship, references
- [x] `git init`; `git config user.name "0xkinno"`; `git config user.email` (noreply placeholder, confirm before first push)
- [x] Project `.claude/settings.json`: `{"attribution":{"commit":"","pr":"","sessionUrl":false}}`
- [x] `.githooks/commit-msg` rejecting AI attribution; `git config core.hooksPath .githooks`
- [x] `.github/workflows/no-claude-attribution.yml` (regex fixed, runs on push)
- [x] `.gitignore` includes `reference/`, `.env*`, `node_modules`, `.next`
- [x] Clone references into `reference/`; instruction files copied into `reference/` (root copies gitignored)
- [x] Name collision check (npm "quorate" is an unrelated code review CLI; kept); `LICENSE` (MIT); first commit
- [ ] Public GitHub repo `0xkinno/quorate` with the licence visible in About (waiting for the repo URL)
- [x] `RULES_EXTRACT.md`, `LANE_MAP.md`, `SPONSOR_INTEL.md`, `MOMENT.md`, `THESIS.md`
- [ ] Copy each criterion's full sentence from the Devpost page into `RULES_EXTRACT.md`

### Phase 1. Deploy empty at the final URL
- [ ] Next.js skeleton, `/api/live`, `/api/status` (measured), Render Blueprint, Postgres, cron stub
- [ ] Deploy; reachability script passes; commit

### Phase 2. Probe PayPal (FINDINGS first)
- [ ] Commit pre-registered `FINDINGS.md` questions P1 to P10
- [ ] `scripts/probe.ts` with SDK + REST; run; save `docs/probe/*.json`; append dated answers
- [ ] Update guards and scheduler to the observed behaviour

### Phase 3. The Bursar (no UI yet)
- [ ] `allocate.ts` + property tests (6 properties)
- [ ] `renewal.ts` + tests (honor, validity, cannot-reach-close)
- [ ] `guards.ts` (cap, terms hash) + tests
- [ ] `close.ts` saga with attempts log, read-back, top-ups, void, cancel path, crash reconcile + tests
      against the stand-in and a scripted failing PayPal
- [ ] `payouts.ts` batch + poll

### Phase 4. PayPal paths live
- [ ] Order create (AUTHORIZE) and authorize routes; slip approval with JS SDK v6 (or labelled v5)
- [ ] Webhook route with verification and dedupe; register webhook for the Render URL
- [ ] `tick.ts` renewal, lapse, close start, payout polling
- [ ] Invoicing for cash families (record-payment, record-refund)

### Phase 5. The crew
- [ ] Reader (quote + replies) with quote-in-source check and REVIEW
- [ ] Scribe (slip in en/es/vi) with `numbersMatch`
- [ ] Clerk with Agent Toolkit read-only tools + allowlist test
- [ ] Replay fixtures by prompt hash; misbehaving-model fixtures

### Phase 6. Proof
- [ ] Live closes L1 to L7 recorded to `docs/live-runs/`
- [ ] Counterfactual script (labelled)
- [ ] `facts.ts` -> `docs/FACTS.json`; CI drift check; `/api/stats` recomputes the headline
- [ ] Cost per pool measured

### Phase 7. UI
- [ ] `DESIGN.md`; fonts; tokens; mark SVG; hero art SVG
- [ ] Landing (7 sections) with hover-glow cards and the ring motion
- [ ] `/register` with AG Grid theme, renderers, pinned rows, flash, CSV, ask-the-register, AG Charts curve,
      close preview, NEEDS_TEACHER panel
- [ ] `/slip/[token]` phone-first, three languages
- [ ] `/judge`, `/proof/[poolId]`, `/help`, guided tour
- [ ] Playwright layout + axe across 6 viewports; fix until clean; screenshots saved

### Phase 8. Presentation
- [ ] Diagrams (roughjs) to PNG; banner; 2x2 screenshots; decline GIF
- [ ] README from FACTS; `JUDGE.md`, `EVIDENCE.md`, `SDK_SURFACE.md`, `DISCLOSURES.md`,
      `FRICTION.md`, `MILESTONES.md`, `paypal-plan.md`
- [ ] House-style test passes on README and UI
- [ ] Red team: five fresh judge agents on the deployed URL; fix; re-run until clean
- [ ] `SUBMISSION_DEVPOST.md`; video script

### Phase 9. Depth extensions (only after Phase 8 is green)
- [ ] MCP door `/api/mcp`: `pool_status`, `slip_link`
- [ ] Bryntum Scheduler timeline of honor windows and renewals
- [ ] Vault path for trips more than 26 days out
- [ ] Second template (team tournament bus) on the same engine

### Phase 10. Freeze
- [ ] Tag `v1.0-submission`; freeze deployment; record the commit in `PROGRESS.md`
