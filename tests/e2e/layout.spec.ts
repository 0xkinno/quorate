import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

/**
 * Every page at six viewports: no horizontal scroll, the hero copy never overlaps the art, zero console
 * errors, zero axe violations (WCAG 2.2 AA tags), and a screenshot saved to docs/images/screens/.
 */
const VIEWPORTS = [
  { name: "iphone", width: 390, height: 844 }, { name: "android", width: 412, height: 915 }, { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 }, { name: "desktop", width: 1536, height: 864 }, { name: "wide", width: 1920, height: 1080 },
];

async function paths(page: Page) {
  const pools = await (await page.request.get("/api/stats")).json();
  const runs = pools.recorded.liveRuns.scenarios as { pool: string; state: string }[];
  const closed = runs.find((r) => r.state === "CLOSED")!.pool;
  const html = await (await page.request.get("/judge")).text();
  const slip = /\/slip\/([A-Za-z0-9_-]{10,})/.exec(html)?.[1];
  return [
    { name: "landing", url: "/" }, { name: "judge", url: "/judge" }, { name: "register", url: `/register?pool=${closed}` },
    { name: "proof", url: `/proof/${closed}` }, { name: "help", url: "/help" }, ...(slip ? [{ name: "slip", url: `/slip/${slip}` }] : []),
  ];
}

mkdirSync("docs/images/screens", { recursive: true });

for (const vp of VIEWPORTS) {
  test(`layout and accessibility at ${vp.name} ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const errors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !/paypal\.com|sandbox\.paypal|favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    for (const p of await paths(page)) {
      await page.goto(p.url, { waitUntil: "load" });
      await page.waitForTimeout(p.name === "register" ? 2500 : p.name === "slip" ? 6000 : 600);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${p.name} horizontal scroll`).toBeLessThanOrEqual(1);
      if (p.name === "landing" && vp.width >= 768) {
        const h1 = await page.locator("h1").first().boundingBox();
        const art = await page.locator("svg[role=img]").first().boundingBox();
        if (h1 && art) expect(h1.x + h1.width <= art.x + 1 || h1.y + h1.height <= art.y + 1 || art.y + art.height <= h1.y + 1, "hero copy overlaps the art").toBe(true);
      }
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).exclude("iframe").analyze();
      expect(axe.violations.map((v) => `${p.name}: ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target}`), "axe violations").toEqual([]);
      await page.screenshot({ path: `docs/images/screens/${p.name}-${vp.name}.png`, fullPage: false });
    }
    expect(errors, "console errors").toEqual([]);
  });
}
