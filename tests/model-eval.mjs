// Runs the real in-browser model against the scripted questions. Needs WebGPU and downloads ~880 MB on first run.
// Expects `npm run preview` on port 4173. If WebGPU is unavailable it says so and writes nothing.
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { EVAL } from "../src/evalset.js";
import { saysHandoff } from "../src/guard.js";

const url = process.env.URL || "http://localhost:4173/";
mkdirSync(new URL("../scratch/profile", import.meta.url), { recursive: true });
const ctx = await chromium.launchPersistentContext(new URL("../scratch/profile", import.meta.url).pathname, {
  headless: true, args: ["--enable-unsafe-webgpu", "--use-angle=metal", "--enable-features=WebGPU"]
});
const p = ctx.pages()[0] || await ctx.newPage();
const MODEL = process.env.MODEL; const TAG = process.env.TAG || "";
await p.goto(url + (MODEL ? "?model=" + MODEL : ""));
await p.waitForFunction(() => window.__demo && window.__demo.gpu());
const gpu = await p.evaluate(() => window.__demo.gpu());
if (!gpu.ok) { console.log("MODEL PATH NOT RUN: no WebGPU in this browser. " + gpu.reason); await ctx.close(); process.exit(2); }
console.log("WebGPU ok, model:", gpu.modelId);
const t0 = Date.now();
await p.evaluate(() => window.__demo.load());
await p.waitForFunction(() => window.__demo.mode() === "model", null, { timeout: 15 * 60 * 1000 });
console.log("model loaded in", Math.round((Date.now() - t0) / 1000), "s");
const runs = [];
for (const t of EVAL) {
  const r = await p.evaluate((q) => window.__demo.ask(q), t.q);
  const raw = r.raw, shown = r.shown;
  const okRaw = t.type === "answer" ? t.expect.test(raw) && !saysHandoff(raw) : saysHandoff(raw);
  const okShown = t.type === "answer" ? t.expect.test(shown) && !saysHandoff(shown) : saysHandoff(shown);
  runs.push({ type: t.type, q: t.q, raw, shown, ms: Math.round(r.ms), replaced: r.replaced, okRaw, okShown });
  console.log(`${okRaw ? "PASS" : "FAIL"}/${okShown ? "PASS" : "FAIL"} ${t.type.padEnd(7)} ${Math.round(r.ms)}ms | ${t.q} -> ${raw}`);
}
const c = (type, k) => runs.filter((r) => r.type === type && r[k]).length;
const n = (type) => runs.filter((r) => r.type === type).length;
const ms = runs.filter((r) => r.ms > 20).map((r) => r.ms).sort((a, b) => a - b);
const out = {
  ran: true, date: new Date().toISOString().slice(0, 10), n: runs.length,
  browser: "Chromium " + ctx.browser().version() + ", headless, WebGPU flags on, Apple GPU via Metal",
  modelId: gpu.modelId,
  answerN: n("answer"), handoffN: n("handoff"),
  answerRaw: c("answer", "okRaw"), answerGuarded: c("answer", "okShown"),
  handoffRaw: c("handoff", "okRaw"), handoffGuarded: c("handoff", "okShown"),
  modelRuns: ms.length, medianMs: ms[Math.floor(ms.length / 2)], minMs: ms[0], maxMs: ms[ms.length - 1]
};
if (!process.env.NO_SAVE) { const f = new URL("../src/results.json", import.meta.url);
const cur = JSON.parse(readFileSync(f, "utf8")); cur.model = out;
writeFileSync(f, JSON.stringify(cur, null, 2) + "\n"); }
writeFileSync(new URL(`../docs/model-eval-transcript${TAG}.json`, import.meta.url), JSON.stringify({ summary: out, runs }, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
await ctx.close();
