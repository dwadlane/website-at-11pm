// Regression tests for the audit findings. Each of these failed before the fix.
import assert from "node:assert/strict";
import { EVAL_DEV } from "../src/evalset.js";
import { SAMPLE_FACTS, CHIPS } from "../src/sample.js";
import { instantReply } from "../src/instant.js";
import { saysHandoff } from "../src/guard.js";
import { readFileSync } from "node:fs";

const fails = [];
for (const t of EVAL_DEV) {
  const r = instantReply(t.q, SAMPLE_FACTS);
  let ok;
  if (t.type === "handoff") ok = saysHandoff(r.text);
  else ok = t.expect.test(r.text) && !saysHandoff(r.text) && (!t.also || t.also.test(r.text)) && (!t.not || !t.not.test(r.text));
  if (!ok) fails.push(`${t.type} | ${t.q} -> ${r.text}`);
}
assert.deepEqual(fails, [], "tuning-set failures:\n" + fails.join("\n"));

// W1: the first chip is the page's headline scenario and must not hand off.
const chip1 = instantReply(CHIPS[0], SAMPLE_FACTS);
assert.ok(!saysHandoff(chip1.text), "first chip must be answered: " + chip1.text);
assert.ok(chip1.matched);
// W1: the second chip must give the night price, not the shop-hours line.
assert.match(instantReply(CHIPS[1], SAMPLE_FACTS).text, /\$170/);

// W4: lines are separated by a line break, never glued together.
const phone = instantReply("What is the phone?", SAMPLE_FACTS).text;
assert.ok(!/\d{4}\s+Shop hours/.test(phone));
const price = instantReply("How much does a lockout cost?", SAMPLE_FACTS).text;
assert.ok(price.includes("\n") && /\$130/.test(price) && /\$170/.test(price));

// W5: greetings and thanks never get the handoff line.
for (const q of ["Hello", "hi there", "thanks!", "Thank you"]) assert.ok(!saysHandoff(instantReply(q, SAMPLE_FACTS).text), q);

// Things the facts do not cover must still hand off (the loosened rule must not guess).
for (const q of ["Do you give a military discount?", "Do you speak Spanish?", "Can I pay with Venmo?", "What is the warranty on your work?", "Do you serve Riverside County?"]) {
  assert.ok(saysHandoff(instantReply(q, SAMPLE_FACTS).text), q);
}

// W3: the page must say the scores were tuned and show the untouched score.
const main = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
assert.match(main, /tuned/i);
assert.match(main, /never used for tuning/i);

// CTA link and offer name.
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.ok(html.includes("https://gaps2gains.com/diagnosis"));
assert.ok(!/gaps2gains\.com\/checkup/i.test(html));
console.log("regression tests passed");
