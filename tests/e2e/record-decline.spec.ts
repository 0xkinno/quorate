import { test } from "@playwright/test";

/**
 * Records the README GIF: the judge button starts a live sandbox run where PayPal declines family 7,
 * and The Register shows the close as it happens. Run only on purpose: RECORD=1 npx playwright test record-decline
 */
test.skip(!process.env.RECORD, "set RECORD=1 to record");
test.use({ viewport: { width: 1440, height: 900 }, video: { mode: "on", size: { width: 1440, height: 900 } } });
test.setTimeout(560_000);

test("record a live close with a PayPal decline", async ({ page }) => {
  await page.goto("/judge");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /with a PayPal decline/ }).click();
  await page.waitForURL(/register\?pool=run-/, { timeout: 30_000 });
  for (let i = 0; i < 420; i++) {
    const stamp = (await page.locator(".stamp").first().textContent())?.trim() ?? "";
    if (/^(CLOSED|NEEDS_TEACHER|FAILED|LAPSED)$/.test(stamp)) break;
    await page.waitForTimeout(1000);
  }
  await page.locator("aside").scrollIntoViewIfNeeded();
  await page.waitForTimeout(4000);
});
