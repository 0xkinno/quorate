import { test, expect } from "@playwright/test";

/**
 * Every action a judge can take, end to end in Chromium (a live sandbox run is recorded separately by
 * record-decline.spec.ts because it takes minutes). Run: npx playwright test flows
 */
test.use({ viewport: { width: 1440, height: 900 } });

test("landing: hero, sections, price curve and the judge link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nobody fronts the money.");
  for (const h of ["Thursday, 3:10pm.", "Group payments without a group payer.", "PayPal declines a capture. The total is still exact.", "Three refusals, written in code.", "Counted from recorded runs."])
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  await expect(page.getByText("$63.38").first()).toBeVisible();
  await page.getByRole("link", { name: "Open the demo trip" }).click();
  await expect(page).toHaveURL(/\/judge/);
});

test("judge: live buttons, sandbox status, demo slip and recorded runs", async ({ page }) => {
  await page.goto("/judge");
  await expect(page.getByText(/sandbox, token/)).toBeVisible();
  for (const b of ["Run it live, with a PayPal decline", "Run a clean close", "Same engine: a team bus"]) await expect(page.getByRole("button", { name: b })).toBeEnabled();
  await expect(page.getByRole("link", { name: /Open a demo slip/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Proof", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("table", { name: "" }).or(page.locator("table.ledger"))).toBeVisible();
});

test("register: rows, tabs, totals, CSV export, links", async ({ page }) => {
  await page.goto("/register?pool=run-20261112-2f5570");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("PayPal declines family 7");
  await expect(page.getByText("Exact to the cent")).toBeVisible();
  await expect(page.locator(".ag-row").first()).toBeVisible();
  await page.getByRole("tab", { name: "Needs you" }).click();
  const grid = page.locator(".ag-root-wrapper");
  await expect(grid.getByText("Zoe B.", { exact: true })).toBeVisible(); // the declined family
  await expect(grid.getByText("Maya R.", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Settled" }).click();
  await expect(grid.getByText("Maya R.", { exact: true })).toBeVisible();
  await expect(grid.getByText("Zoe B.", { exact: true })).toHaveCount(0);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export for the school office" }).click()]);
  expect(dl.suggestedFilename()).toMatch(/register-run-20261112-2f5570\.csv/);
  await expect(page.getByRole("link", { name: "Honor timeline" })).toBeVisible();
  await page.getByRole("link", { name: "Proof page" }).click();
  await expect(page).toHaveURL(/\/proof\/run-20261112-2f5570/);
});

test("proof: money, payout, timeline, every hold, attempt log, copy chip", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/proof/run-20261112-2f5570");
  for (const h of ["The money", "Payout", "The close, step by step", "Every hold", "Attempt log", "Verified webhooks"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
  await expect(page.getByText("exact to the cent")).toBeVisible();
  await expect(page.getByText("$1,592.00").first()).toBeVisible();
  await expect(page.getByText(/PAYER_CANNOT_PAY/).first()).toBeVisible();
  const chip = page.locator(".chip").first();
  await chip.click();
  await expect(chip).toContainText("copied");
  await page.getByRole("link", { name: "Attempt log" }).click();
  await expect(page).toHaveURL(/#attempts/);
});

test("slip: three languages and the PayPal button", async ({ page }) => {
  await page.goto("/judge");
  const href = await page.getByRole("link", { name: /Open a demo slip/ }).getAttribute("href");
  await page.goto(`${href}?lang=en`);
  await expect(page.getByText("Held today: $88.00")).toBeVisible();
  await page.getByRole("link", { name: "ES", exact: true }).click();
  await expect(page.getByText("Retenido hoy: $88.00")).toBeVisible();
  await page.getByRole("link", { name: "VI", exact: true }).click();
  await expect(page.getByText(/Tạm giữ hôm nay: \$88\.00/)).toBeVisible();
  await expect(page.frameLocator("iframe[title*='PayPal']").first().locator("body")).toBeVisible({ timeout: 20_000 });
});

test("tour: six steps with keyboard, across pages", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start the guided tour" }).click();
  await expect(page.getByRole("dialog", { name: "Tour step 1 of 6" })).toBeVisible();
  await page.waitForTimeout(700);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Tour step 2 of 6" })).toBeVisible();
  await page.waitForTimeout(700);
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/\/judge\?tour=3/);
  await page.waitForTimeout(900);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog", { name: "Tour step 2 of 6" })).toBeVisible();
  await page.waitForTimeout(700);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("help desk: the Clerk answers and refuses money; the Reader checks a quote", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/help");
  await page.getByRole("button", { name: "Can you refund me $20 now?" }).click();
  const answer = page.locator("ol[aria-live] li").first();
  await expect(answer).toBeVisible({ timeout: 60_000 });
  await expect(answer).not.toContainText(/refunded \$20/i);
  await page.getByRole("button", { name: "Read the quote" }).click();
  await expect(page.getByText(/Bayline Coaches/).last()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/CHECKED|REVIEW/).first()).toBeVisible();
});

test("timeline: Bryntum draws every hold's honor window", async ({ page }) => {
  await page.goto("/timeline?pool=run-20261112-2f5570");
  await expect(page.locator(".b-sch-event").first()).toBeVisible({ timeout: 60_000 });
  expect(await page.locator(".b-sch-event").count()).toBeGreaterThanOrEqual(20);
});

test("APIs: status measured, stats from FACTS, MCP door read-only", async ({ request }) => {
  const st = await (await request.get("/api/status")).json();
  expect(st.probes.paypal.ok).toBe(true);
  const stats = await (await request.get("/api/stats")).json();
  expect(stats.recorded.liveRuns.centsOff).toBe(0);
  const list = await (await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 1, method: "tools/list" } })).json();
  expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual(["pool_status", "slip_status"]);
  const call = await (await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "pool_status", arguments: { poolId: "run-20261112-2f5570" } } } })).json();
  expect(JSON.parse(call.result.content[0].text).close.exact).toBe(true);
  const slip = await (await request.post("/api/mcp", { data: { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "slip_status", arguments: { child: "Maya R." } } } })).json();
  const slipState = JSON.parse(slip.result.content[0].text);
  expect(slipState.holdAmount).toBe("$88.00");
  expect(JSON.stringify(slipState)).not.toContain("/slip/"); // the door never hands out slip links
});
