import { test } from "@playwright/test";

/** Full-page screenshots for visual review: SHOTS=1 npx playwright test shots. Output: test-results/shots/ */
test.skip(!process.env.SHOTS, "set SHOTS=1");
const PAGES = (process.env.SHOTS_PAGES ?? "/proof/run-20261112-2f5570").split(",");
for (const vp of [{ n: "desktop", w: 1536, h: 900 }, { n: "phone", w: 390, h: 844 }]) {
  test(`shots ${vp.n}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const p of PAGES) {
      await page.goto(p, { waitUntil: "load" });
      await page.waitForTimeout(p.includes("slip") ? 5000 : 1500);
      for (let y = 0; y < 12000; y += 500) { await page.mouse.wheel(0, 500); await page.waitForTimeout(120); }
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      await page.screenshot({ path: `test-results/shots/${p.replace(/[^a-z0-9]+/gi, "_")}-${vp.n}.png`, fullPage: true });
    }
  });
}
