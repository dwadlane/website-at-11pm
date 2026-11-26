// Plain rule-based checks that run after the model. No AI here.
export function handoffText(facts) {
  return "I don't have that one. A person will confirm it and get back to you.";
}

function numbersIn(text) {
  return (text.replace(/,/g, "").match(/\d+(?:[.:]\d+)*/g) || []).map((n) => n.replace(/[.:]$/, ""));
}

// If the reply contains a number that is in neither the facts nor the customer's question,
// the model made it up. Replace the reply with the handoff line.
export function guard(reply, facts, question) {
  const known = new Set(numbersIn(facts + " " + question));
  const extra = numbersIn(reply).filter((n) => !known.has(n));
  if (extra.length) return { text: handoffText(facts), replaced: true, why: "The model used a number that is not in the facts: " + extra.join(", ") };
  return { text: reply.trim(), replaced: false };
}

export function saysHandoff(reply) {
  return /confirm/i.test(reply) && /(person|someone|team|owner|staff)/i.test(reply);
}
