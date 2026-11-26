// Browser test of the fallback path. Expects `npm run preview` on port 4173.
import { chromium } from "playwright";
import assert from "node:assert/strict";
const url = process.env.URL || "http://localhost:4173/";
const b = await chromium.launch();
const p = await b.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(String(e)));
await p.goto(url);
await p.waitForSelector("#loadText");
await p.waitForFunction(() => document.getElementById("loadText").textContent.length > 10);
const gpu = await p.evaluate(() => window.__demo.gpu());
console.log("WebGPU in this test browser:", JSON.stringify(gpu));
const loadText = await p.textContent("#loadText");
if (!gpu.ok) {
  assert.match(loadText, /cannot run the AI model/);
  assert.equal(await p.isHidden("#loadBtn"), true);
}
assert.match(await p.textContent("#modebar"), /Instant mode/);
await p.fill("#q", "How much is a lockout at night?"); await p.click("#send");
await p.waitForSelector(".msg.bot:nth-of-type(3)");
const reply = await p.textContent(".msg.bot:last-child p");
assert.match(reply, /\$170/);
assert.match(await p.textContent("#timerVal"), /ms/);
assert.match(await p.textContent("#timerLabel"), /not the model/);
assert.match(await p.textContent("body"), /Demo with sample data/);
assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
// The first suggested chip is the headline scenario and must get a real answer, not a handoff.
await p.click(".chip:first-child");
await p.waitForFunction(() => document.querySelectorAll(".msg.bot").length >= 3);
const chipReply = await p.textContent(".msg.bot:last-child p");
assert.doesNotMatch(chipReply, /I don't have that one/);
const sheet = await p.textContent("#results");
assert.match(sheet, /never used for tuning/);
assert.deepEqual(errors, []);
console.log("fallback test passed (reply:", reply.slice(0, 60) + ")");
await b.close();
