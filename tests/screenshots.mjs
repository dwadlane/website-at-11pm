// Takes desktop and mobile screenshots into docs/screenshots. Expects `npm run preview` on port 4173.
// "fallback-*" use a browser with no WebGPU. "model-*" use WebGPU flags and the cached model (only if it loads).
import { chromium } from "playwright";
const url = process.env.URL || "http://localhost:4173/";
const out = new URL("../docs/screenshots/", import.meta.url).pathname;
const sizes = { desktop: { width: 1360, height: 900 }, mobile: { width: 390, height: 844 } };

async function fallback() {
  const b = await chromium.launch();
  for (const [name, vp] of Object.entries(sizes)) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    await p.goto(url); await p.waitForFunction(() => document.getElementById("loadText").textContent.length > 10);
    await p.evaluate(() => window.__demo.ask("How much is a lockout at this hour?"));
    await p.evaluate(() => window.__demo.ask("Do you give a military discount?"));
    await p.screenshot({ path: `${out}fallback-${name}-top.png` });
    await p.screenshot({ path: `${out}fallback-${name}-full.png`, fullPage: true });
    console.log("overflow", name, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  }
  await b.close();
}
async function model() {
  const ctx = await chromium.launchPersistentContext(new URL("../scratch/profile", import.meta.url).pathname, {
    headless: true, args: ["--enable-unsafe-webgpu", "--use-angle=metal", "--enable-features=WebGPU"]
  });
  for (const [name, vp] of Object.entries(sizes)) {
    const p = await ctx.newPage(); await p.setViewportSize(vp);
    await p.goto(url); await p.waitForFunction(() => window.__demo && window.__demo.gpu());
    if (!(await p.evaluate(() => window.__demo.gpu().ok))) { console.log("model shots skipped: no WebGPU"); break; }
    await p.evaluate(() => window.__demo.load());
    await p.waitForFunction(() => window.__demo.mode() === "model", null, { timeout: 120000 });
    await p.evaluate(() => window.__demo.ask("How much is a lockout at this hour?"));
    await p.evaluate(() => window.__demo.ask("Do you give a military discount?"));
    await p.screenshot({ path: `${out}model-${name}-top.png` });
    await p.close();
  }
  await ctx.close();
}
await fallback();
if (process.argv.includes("--model")) await model();
