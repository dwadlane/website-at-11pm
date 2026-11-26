import assert from "node:assert/strict";
import { guard, saysHandoff } from "../src/guard.js";
import { SAMPLE_FACTS } from "../src/sample.js";
import { buildMessages } from "../src/prompt.js";

const g1 = guard("A night lockout is $170.", SAMPLE_FACTS, "how much at night");
assert.equal(g1.replaced, false);
const g2 = guard("A night lockout is $199.", SAMPLE_FACTS, "how much at night");
assert.equal(g2.replaced, true);
assert.ok(saysHandoff(g2.text));
assert.equal(guard("We arrive in 30 to 45 minutes.", SAMPLE_FACTS, "when").replaced, false);
assert.equal(guard("We arrive in 7 minutes.", SAMPLE_FACTS, "when").replaced, true);
assert.equal(guard("Yes, we cover Eastside.", SAMPLE_FACTS, "do you cover eastside").replaced, false);
const m = buildMessages("FACTS", [], "hi");
assert.equal(m[0].role, "system"); assert.ok(m[0].content.includes("FACTS")); assert.equal(m.at(-1).content, "hi");
// no em or en dashes anywhere in shipped copy
import { readFileSync } from "node:fs";
for (const f of ["index.html", "src/sample.js", "src/main.js", "src/prompt.js", "README.md", "docs/BRIEF.md"]) {
  try { assert.ok(!/[–—]/.test(readFileSync(new URL("../" + f, import.meta.url), "utf8")), "dash in " + f); } catch (e) { if (e.code !== "ENOENT") throw e; }
}
console.log("unit tests passed");
