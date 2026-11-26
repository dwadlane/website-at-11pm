// Scores Instant mode (keyword lookup) on the scripted questions. Runs in Node, no browser needed.
import { writeFileSync, readFileSync } from "node:fs";
import { EVAL } from "../src/evalset.js";
import { SAMPLE_FACTS } from "../src/sample.js";
import { instantReply } from "../src/instant.js";
import { saysHandoff } from "../src/guard.js";

let answer = 0, handoff = 0, aN = 0, hN = 0; const lines = [];
for (const t of EVAL) {
  const r = instantReply(t.q, SAMPLE_FACTS);
  if (t.type === "answer") { aN++; const ok = t.expect.test(r.text) && !saysHandoff(r.text); if (ok) answer++; lines.push(`${ok ? "PASS" : "FAIL"} answer  | ${t.q} -> ${r.text}`); }
  else { hN++; const ok = saysHandoff(r.text); if (ok) handoff++; lines.push(`${ok ? "PASS" : "FAIL"} handoff | ${t.q} -> ${r.text}`); }
}
console.log(lines.join("\n"));
console.log(`Instant mode: answers ${answer}/${aN}, handoffs ${handoff}/${hN}`);
const p = new URL("../src/results.json", import.meta.url);
const cur = JSON.parse(readFileSync(p, "utf8"));
cur.instant = { ran: true, date: new Date().toISOString().slice(0, 10), answer, answerN: aN, handoff, handoffN: hN };
writeFileSync(p, JSON.stringify(cur, null, 2) + "\n");
