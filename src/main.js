import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "./style.css";
import { SAMPLE_FACTS, GREETING, CHIPS } from "./sample.js";
import { buildMessages } from "./prompt.js";
import { guard, handoffText } from "./guard.js";
import { instantReply, retrieve, smallTalk } from "./instant.js";
import { detectWebGPU, isCached, loadModel, chat } from "./llm.js";
import results from "./results.json";

const $ = (id) => document.getElementById(id);
const state = { mode: "instant", gpu: null, busy: false, history: [] };
// ?pipeline=plain turns the fact-matching gate off. Only used by the scripted tests to compare.
const GATED = new URLSearchParams(location.search).get("pipeline") !== "plain";
const FACTS_KEY = "g2-11pm-facts";

// ---------- theme and text size ----------
const root = document.documentElement;
$("theme").onclick = () => {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  const cur = root.dataset.theme || (dark ? "dark" : "light");
  const next = cur === "dark" ? "light" : "dark";
  root.dataset.theme = next; try { localStorage.setItem("g2-theme", next); } catch {}
};
const bump = (d) => {
  const cur = parseFloat(getComputedStyle(root).fontSize);
  const n = Math.min(24, Math.max(14, cur + d)); root.style.fontSize = n + "px";
  try { localStorage.setItem("g2-font", n); } catch {}
};
$("fontUp").onclick = () => bump(1); $("fontDown").onclick = () => bump(-1);

// ---------- facts ----------
const factsEl = $("facts");
try { factsEl.value = localStorage.getItem(FACTS_KEY) || SAMPLE_FACTS; } catch { factsEl.value = SAMPLE_FACTS; }
factsEl.addEventListener("input", () => { try { localStorage.setItem(FACTS_KEY, factsEl.value); } catch {} });
$("resetFacts").onclick = () => { factsEl.value = SAMPLE_FACTS; try { localStorage.removeItem(FACTS_KEY); } catch {} };

// ---------- chat UI ----------
const log = $("log");
function bubble(role, text, meta, flag) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  const p = document.createElement("p"); p.textContent = text; el.appendChild(p);
  if (meta) { const m = document.createElement("small"); m.textContent = meta; el.appendChild(m); }
  if (flag) { const f = document.createElement("small"); f.className = "flag"; f.textContent = flag; el.appendChild(f); }
  log.appendChild(el); log.scrollTop = log.scrollHeight;
  return el;
}
bubble("bot", GREETING, "Sample opening line");
for (const c of CHIPS) {
  const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = c;
  b.onclick = () => ask(c); $("chips").appendChild(b);
}

function setMode(mode) {
  state.mode = mode;
  $("modebar").className = "modebar " + mode;
  $("modebar").textContent = mode === "model"
    ? "Answering with: the AI model, running on this device."
    : "Answering with: Instant mode. This is a simple keyword lookup, not AI.";
}
setMode("instant");

const fmt = (ms) => (ms < 1000 ? Math.round(ms) + " ms" : (ms / 1000).toFixed(2) + " s");

async function ask(question) {
  question = (question || "").trim();
  if (!question || state.busy) return;
  state.busy = true; $("send").disabled = true;
  const facts = factsEl.value;
  bubble("user", question);
  $("q").value = "";
  const timerEl = $("timerVal"), label = $("timerLabel");
  try {
    if (state.mode === "model") {
      label.textContent = "Reply timer (AI model)";
      const live = bubble("bot", "…");
      let raf, t0 = performance.now();
      const tick = () => { timerEl.textContent = fmt(performance.now() - t0) + " …"; raf = requestAnimationFrame(tick); };
      tick();
      let sendFacts = facts;
      const talk = smallTalk(question);
      if (talk) {
        cancelAnimationFrame(raf);
        live.querySelector("p").textContent = talk;
        const m = document.createElement("small"); m.textContent = "Greeting, so the model was not asked."; live.appendChild(m);
        timerEl.textContent = "no model run (greeting)";
        state.history.push({ role: "user", text: question }, { role: "assistant", text: talk });
        last = { raw: talk, shown: talk, ms: 0, replaced: false, gated: true };
        return;
      }
      if (GATED) {
        const hits = retrieve(question, facts);
        if (!hits.length) {
          cancelAnimationFrame(raf);
          const ms = performance.now() - t0;
          live.querySelector("p").textContent = handoffText(facts);
          const m = document.createElement("small"); m.textContent = "No matching fact found, so the model was not asked. Lookup took " + (ms < 1 ? "under 1 ms" : fmt(ms)); live.appendChild(m);
          timerEl.textContent = "no model run (nothing in the facts matched), lookup " + (ms < 1 ? "under 1 ms" : fmt(ms));
          state.history.push({ role: "user", text: question }, { role: "assistant", text: handoffText(facts) });
          last = { raw: handoffText(facts), shown: handoffText(facts), ms, replaced: false, gated: true };
          return;
        }
        // Gate only decides whether to ask the model at all. The model still sees all the facts.
      }
      const r = await chat(buildMessages(sendFacts, state.history, question), (t) => { live.querySelector("p").textContent = t; log.scrollTop = log.scrollHeight; });
      cancelAnimationFrame(raf);
      const g = guard(r.text, facts, question);
      live.querySelector("p").textContent = g.text;
      const bits = [`Replied in ${fmt(r.totalMs)}`, r.firstMs != null ? `first word ${fmt(r.firstMs)}` : null, r.tokens ? `${r.tokens} tokens` : null, r.decodeTps ? `${r.decodeTps.toFixed(1)} tokens/s` : null, "AI model"].filter(Boolean);
      const m = document.createElement("small"); m.textContent = bits.join(" · "); live.appendChild(m);
      if (g.replaced) { const f = document.createElement("small"); f.className = "flag"; f.textContent = "Safety check swapped this reply. " + g.why; live.appendChild(f); }
      timerEl.textContent = `${fmt(r.totalMs)} total, ${r.firstMs != null ? fmt(r.firstMs) : "n/a"} to first word (measured)`;
      state.history.push({ role: "user", text: question }, { role: "assistant", text: g.text });
      last = { raw: r.text, shown: g.text, ms: r.totalMs, replaced: g.replaced };
    } else {
      label.textContent = "Reply timer (Instant mode, not the model)";
      const t0 = performance.now();
      const r = instantReply(question, facts);
      const ms = performance.now() - t0;
      bubble("bot", r.text, `Looked up in ${ms < 1 ? "under 1 ms" : fmt(ms)} · Instant mode, not AI`);
      timerEl.textContent = `${ms < 1 ? "under 1 ms" : fmt(ms)} (keyword lookup, says nothing about the model's speed)`;
      state.history.push({ role: "user", text: question }, { role: "assistant", text: r.text });
      last = { raw: r.text, shown: r.text, ms, replaced: false };
    }
  } catch (e) {
    bubble("bot", "Something went wrong while answering. A person will confirm and get back to you.", "Error: " + (e && e.message ? e.message : e));
    timerEl.textContent = "failed";
    last = { error: String(e && e.message || e) };
  } finally {
    state.busy = false; $("send").disabled = false;
  }
}
let last = null;
$("form").addEventListener("submit", (e) => { e.preventDefault(); ask($("q").value); });

// ---------- model loading ----------
async function init() {
  const gpu = await detectWebGPU();
  state.gpu = gpu;
  const text = $("loadText"), btn = $("loadBtn");
  if (!gpu.ok) {
    text.textContent = "This browser cannot run the AI model. " + gpu.reason + " The chat above still works in Instant mode, which is a plain keyword lookup. To see the model, open this page in a recent desktop Chrome or Edge.";
    btn.hidden = true; $("loadCard").classList.add("nogpu");
    return;
  }
  const cached = await isCached(gpu.modelId);
  text.textContent = cached
    ? "The model is already saved on this device, so it should start quickly."
    : "The first load downloads about 880 MB of model files and keeps them in your browser, so later visits are fast. Use Wi-Fi if you can. Until then, the chat uses Instant mode.";
  btn.textContent = cached ? "Start the model" : "Download and start the model (about 880 MB)";
  btn.onclick = async () => {
    btn.disabled = true; $("track").hidden = false;
    const started = performance.now();
    try {
      await loadModel(gpu.modelId, ({ progress, text: t }) => {
        $("fill").style.width = Math.round(progress * 100) + "%";
        $("loadStatus").textContent = Math.round(progress * 100) + "%  " + t;
      });
      $("loadStatus").textContent = `Model ready. Loaded in ${fmt(performance.now() - started)}.`;
      btn.hidden = true; setMode("model");
    } catch (e) {
      $("loadStatus").textContent = "The model could not start: " + (e && e.message ? e.message : e) + " The chat keeps working in Instant mode.";
      btn.disabled = false; btn.textContent = "Try again";
    }
  };
}
const initDone = init();

// ---------- test results panel ----------
function renderResults() {
  const el = $("results");
  const m = results.model, i = results.instant, ho = results.instantHeldout;
  let h = "<h2>How often it sticks to the facts</h2><p class='hint'>Scripted questions, 12 with an answer in the facts and 12 without. These 24 are the questions the prompt and the lookup were tuned on, so these scores are better than you should expect from real customers.</p>";
  if (ho && ho.ran) {
    const tot = ho.answer + ho.handoff, n = ho.answerN + ho.handoffN;
    h += `<p><b>Fresh questions, never used for tuning</b> (${n} questions written before the lookup was changed, ${ho.date}): Instant mode got <b>${tot}/${n}</b> right. That is ${ho.answer}/${ho.answerN} of the questions the facts answer and ${ho.handoff}/${ho.handoffN} of the questions they do not. ${ho.note}</p>`;
  }
  if (i && i.ran) h += `<p><b>Instant mode on the tuned 24</b> (keyword lookup, ${i.date}): handed off correctly on <b>${i.handoff}/${i.handoffN}</b> unknown questions, answered <b>${i.answer}/${i.answerN}</b> known questions. Instant mode is a plain keyword lookup. It is weak on wording it has not seen, so expect it to miss or hand off questions the facts do answer.</p>`;
  if (m && m.ran) {
    h += `<p><b>AI model</b> (${m.n} tuned questions, ${m.date}, ${m.browser}): handed off correctly on <b>${m.handoffRaw}/${m.handoffN}</b> unknown questions with the fact-match gate in front of it. Answered the known questions right <b>${m.answerRaw}/${m.answerN}</b>. Median model reply ${m.medianMs} ms on ${m.modelRuns} replies (replies with no matching fact skip the model). The model was not scored on fresh questions, and this run used an earlier, stricter version of the fact-match gate.</p>`;
  } else {
    h += "<p><b>AI model:</b> the scripted test was <b>not run</b> in the test browser used to build this page (no WebGPU there). No model numbers are claimed.</p>";
  }
  el.innerHTML = h;
}
renderResults();

// Hook for the scripted tests. Not used by the page itself.
window.__demo = {
  setFacts: (t) => { factsEl.value = t; },
  mode: () => state.mode,
  gpu: () => state.gpu,
  async ask(q) { state.history = []; await ask(q); return last; },
  load: async () => { await initDone; $("loadBtn").click(); }
};
