/**
 * Render cron, every minute. Idempotent and safe to run twice.
 * Phase 4 fills in: renew holds whose renew_at has passed, mark expired holds, start the close when
 * a quorate pool reaches its close time, void every hold of a lapsed pool, poll payouts not final.
 */
const started = new Date().toISOString();
console.log(JSON.stringify({ tick: started, pools: 0, note: "no pools yet" }));
