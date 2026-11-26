// Scores Instant mode on questions that were never used for tuning. Reports the number honestly.
import { HELDOUT } from "./heldout-set.js";
import { SAMPLE_FACTS } from "../src/sample.js";
import { instantReply } from "../src/instant.js";
import { saysHandoff } from "../src/guard.js";
let a = 0, h = 0, aN = 0, hN = 0; const out = [];
for (const t of HELDOUT) {
  const r = instantReply(t.q, SAMPLE_FACTS);
  if (t.type === "answer") { aN++; const ok = t.expect.test(r.text) && !saysHandoff(r.text); if (ok) a++; out.push(`${ok ? "PASS" : "FAIL"} answer  | ${t.q} -> ${r.text.replace(/\n/g, " / ")}`); }
  else { hN++; const ok = saysHandoff(r.text); if (ok) h++; out.push(`${ok ? "PASS" : "FAIL"} handoff | ${t.q} -> ${r.text.replace(/\n/g, " / ")}`); }
}
if (process.argv.includes("-v")) console.log(out.join("\n"));
console.log(`Held-out Instant mode: answers ${a}/${aN}, handoffs ${h}/${hN}, total ${a + h}/${aN + hN}`);
if (process.argv.includes("--json")) console.log(JSON.stringify({ answer: a, answerN: aN, handoff: h, handoffN: hN }));
if (process.argv.includes("--write")) {
  const { readFileSync, writeFileSync } = await import("node:fs");
  const rp = new URL("../src/results.json", import.meta.url);
  const cur = JSON.parse(readFileSync(rp, "utf8"));
  cur.instantHeldout = { ran: true, date: new Date().toISOString().slice(0, 10), answer: a, answerN: aN, handoff: h, handoffN: hN, note: "Instant mode is the keyword lookup only; the AI model was not scored on these." };
  writeFileSync(rp, JSON.stringify(cur, null, 2) + "\n");
}
