// Instant mode: no AI, no download. Finds the best matching line in the facts.
// This is the fallback for browsers without WebGPU, and for the wait before the model loads.
import { handoffText } from "./guard.js";

const STOP = new Set("a an the is are do does can you your i my me we us to of for in on at it and or be with have has how what when where who which will would could should there this that any if so as by until someone take give from about want please i'm im it's its let m s accept accepts accepted take takes during while around out".split(" "));
// Everyday words that say nothing about the business. They never count as "something the facts do not mention".
const FILLER = new Set("come came coming now here fast quick quickly tonight today house home truck vehicle morning afternoon evening hour time work works go going got get know tell help one two three four five six seven eight nine ten many some more really just still also then than too very yes no ok okay okay sure way make made see look find thing things anything everything something".split(" "));
const SYN = {
  price: "price", prices: "price", cost: "price", costs: "price", charge: "price", fee: "price", much: "price", rate: "price", rates: "price", run: "price", pricing: "price",
  pay: "payment", card: "payment", credit: "payment", debit: "payment", visa: "payment", mastercard: "payment", amex: "payment", cash: "payment", check: "payment", checks: "payment",
  open: "hours", close: "hours", closed: "hours", closes: "hours", late: "hours", sunday: "hours", saturday: "hours", monday: "hours", weekday: "hours", weekend: "hours", day: "hours",
  area: "area", serve: "area", cover: "area", covered: "area", near: "area", county: "area", town: "area", travel: "area", drive: "area", far: "area", miles: "area", mile: "area",
  arrive: "arrival", arrives: "arrival", long: "arrival", soon: "arrival", wait: "arrival", minutes: "arrival", eta: "arrival", fast: "arrival", come: "arrival", coming: "arrival", guaranteed: "arrival", guarantee: "arrival",
  locked: "lockout", lockout: "lockout", stuck: "lockout", unlock: "lockout",
  rekey: "rekey", key: "key", keys: "key", copy: "copy", copies: "copy", deadbolt: "deadbolt", safe: "safe", safes: "safe", phone: "phone", call: "phone", number: "phone",
  need: "need", info: "need", information: "need", details: "need", detail: "need"
};
const TAGS = new Set(Object.values(SYN));

function stem(w) {
  return SYN[w] || SYN[w.replace(/s$/, "")] || w.replace(/ies$/, "y").replace(/(ing|ed|es|s)$/, "");
}

// "11 PM" and "3 AM" are times of day, not unknown numbers. Returns the question with the time replaced by a night or day word.
function normalizeTimes(text) {
  return text.replace(/\b(\d{1,2})(?::\d\d)?\s?(am|pm)\b/gi, (_, h, ap) => {
    let hr = parseInt(h, 10) % 12; if (/pm/i.test(ap)) hr += 12;
    return hr >= 22 || hr < 6 ? " night " : " daytime ";
  });
}

export function stems(text) {
  return normalizeTimes(text).toLowerCase().replace(/[^a-z0-9$ ]/g, " ").split(/\s+/).filter(Boolean)
    .filter((w) => !STOP.has(w)).map(stem);
}

// Stems of the facts are cached, so a long facts block is only processed once.
let cacheKey = null, cache = null;
function parseFacts(facts) {
  if (cacheKey === facts) return cache;
  const lines = facts.split("\n").map((l) => l.replace(/^[-\s]+/, "").trim()).filter((l) => l.length > 8);
  const parsed = lines.map((line) => {
    const s = new Set(stems(line));
    if (line.includes("$")) s.add("price");
    const label = /^([A-Za-z ]{3,20}):/.exec(line);
    return { line, stems: s, label: label ? new Set(stems(label[1])) : new Set() };
  });
  const known = new Set(); for (const p of parsed) for (const w of p.stems) known.add(w);
  cacheKey = facts; cache = { parsed, known };
  return cache;
}

const NIGHT = /\b(night|midnight|tonight|late|this hour|after hours|overnight)\b/i;
const DAYTIME = /\b(day|daytime|morning|noon|afternoon|during the day)\b/i;
const FILLER_STEMS = new Set([...FILLER].map(stem));

// Finds the fact lines that match the question. Used by Instant mode, and as a gate in front of the model.
export function retrieve(question, facts) {
  const { parsed, known } = parseFacts(facts);
  const qs = stems(question);
  if (!qs.length) return [];
  const q = new Set(qs);
  // If the customer asks about something the facts never mention (a place, a brand, a product), do not guess.
  for (const w of q) if (!TAGS.has(w) && !known.has(w) && !FILLER_STEMS.has(w) && !FILLER.has(w)) return [];
  const priceQ = q.has("price");
  // A price question about something specific ("open my safe") should not be answered with every price.
  const GENERIC = new Set(["price", "lockout", "hours", "arrival", "area", "payment", "phone"]);
  const topical = [...q].some((w) => known.has(w) && !GENERIC.has(w) && !FILLER.has(w) && !FILLER_STEMS.has(w));
  const scored = parsed.map((p, i) => {
    let score = 0;
    for (const w of p.stems) if (q.has(w)) score += ["price", "hours", "area", "payment", "arrival"].includes(w) ? 1.5 : 2;
    if (score > 0) for (const w of p.label) if (q.has(w)) score += 1; // the line is about the thing asked
    if (priceQ && !topical && p.line.includes("$")) score += 1.5;
    if (priceQ && score > 0) {
      if (NIGHT.test(question) || /\bnight\b/.test(normalizeTimes(question))) { if (/night/i.test(p.line)) score += 2; else if (/daytime/i.test(p.line)) score -= 2; }
      else if (DAYTIME.test(question) || /\bdaytime\b/.test(normalizeTimes(question))) { if (/daytime/i.test(p.line)) score += 2; else if (/night\)/i.test(p.line)) score -= 2; }
    }
    return { line: p.line, score, i };
  }).sort((a, b) => b.score - a.score || a.i - b.i);
  const best = scored[0];
  if (!best || best.score < 1) return [];
  const cap = priceQ ? 4 : 2;
  return scored.filter((s) => s.score >= best.score - 0.01 && s.score >= 1).slice(0, cap).map((t) => t.line);
}

// Greetings and thanks are not questions about the business. A short canned reply, no lookup.
export function smallTalk(question) {
  const t = question.toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (/^(hi|hello|hey|hiya|howdy|yo|good (morning|evening|afternoon|night))( there| again)?$/.test(t)) return "Hi, thanks for texting. How can I help?";
  if (/^(thanks|thank you|thx|ty|cheers|ok thanks|okay thanks|thanks a lot|thank you so much|great thanks|got it|ok|okay)( so much| a lot)?$/.test(t)) return "You're welcome. Is there anything else I can help with?";
  return null;
}

export function instantReply(question, facts) {
  const talk = smallTalk(question);
  if (talk) return { text: talk, matched: true, smallTalk: true };
  const hits = retrieve(question, facts);
  if (!hits.length) return { text: handoffText(facts), matched: false };
  return { text: hits.join("\n"), matched: true };
}
