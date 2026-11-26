// Scripted questions used by both the Instant-mode test (Node) and the model test (browser).
// type "answer": the facts contain the answer; reply must match `expect`.
// type "handoff": the facts do NOT contain the answer; reply must say a person will confirm.
export const EVAL = [
  { type: "answer", q: "How much is a lockout at night?", expect: /\$?170/ },
  { type: "answer", q: "What does a daytime lockout cost?", expect: /\$?130/ },
  { type: "answer", q: "Do you serve Eastside?", expect: /\b(yes|eastside)\b/i },
  { type: "answer", q: "What are your shop hours?", expect: /8\s?AM.*5\s?PM|monday/i },
  { type: "answer", q: "Are you open on Sunday?", expect: /closed|emergency|any time|lockout/i },
  { type: "answer", q: "Can you rekey my locks?", expect: /rekey|\$25|yes/i },
  { type: "answer", q: "Do you take credit cards?", expect: /card/i },
  { type: "answer", q: "Do you take checks?", expect: /no check|not.*check|cards and cash/i },
  { type: "answer", q: "How long until someone arrives?", expect: /30\s?(to|-)\s?45/i },
  { type: "answer", q: "What do you need from me for a lockout?", expect: /name|address|phone/i },
  { type: "answer", q: "What is your phone number?", expect: /010-0142/ },
  { type: "answer", q: "How much for a new deadbolt?", expect: /\$?120/ },
  { type: "handoff", q: "Do you offer a military discount?" },
  { type: "handoff", q: "Do you work on commercial buildings?" },
  { type: "handoff", q: "What is the warranty on your work?" },
  { type: "handoff", q: "Will you be here in 15 minutes? I need a promise." },
  { type: "handoff", q: "How much to open my safe?" },
  { type: "handoff", q: "Do you serve Riverside County?" },
  { type: "handoff", q: "Do you speak Spanish?" },
  { type: "handoff", q: "Can you set up a smart lock with my Wi-Fi?" },
  { type: "handoff", q: "What is the owner's name?" },
  { type: "handoff", q: "Do you have a payment plan?" },
  { type: "handoff", q: "How much does a new car key cost for a 2019 Honda Civic?" },
  { type: "handoff", q: "Can I pay with Venmo?" }
];

// Tuning set added after the first audit. These ARE used to tune Instant mode, so a score on them
// is a tuned score. The untouched check lives in tests/heldout-set.js.
export const EVAL_DEV = [
  { type: "answer", q: "I'm locked out of my car. Can you come now?", expect: /ask|name|phone|address|lockout|any time|30\s?to\s?45/i },
  { type: "answer", q: "How much is a lockout at this hour?", expect: /\$?170/ },
  { type: "answer", q: "Do you cover Eastside?", expect: /eastside/i },
  { type: "handoff", q: "Do you give a military discount?" },
  { type: "answer", q: "What does a lockout cost at 11 PM?", expect: /\$?170/ },
  { type: "answer", q: "How much is a lockout during the day?", expect: /\$?130/ },
  { type: "answer", q: "Lockout at 3 AM cost?", expect: /\$?170/ },
  { type: "answer", q: "What are your prices?", expect: /\$130/, also: /\$170/ },
  { type: "answer", q: "How far will you travel?", expect: /20 miles/i },
  { type: "answer", q: "How many miles do you cover?", expect: /20 miles/i },
  { type: "answer", q: "Do you work Sundays?", expect: /closed|emergency/i },
  { type: "answer", q: "Is Eastside covered?", expect: /eastside/i },
  { type: "answer", q: "Do you copy keys?", expect: /car key copies/i },
  { type: "answer", q: "Do you accept cash?", expect: /cash/i },
  { type: "answer", q: "Can you come to my house now?", expect: /30\s?to\s?45|lockout|any time/i },
  { type: "answer", q: "How fast can you get here?", expect: /30\s?to\s?45/i },
  { type: "answer", q: "What is the price?", expect: /\$130/, also: /\$25/ },
  { type: "answer", q: "How much does a lockout cost?", expect: /\$130/, also: /\$170/ },
  { type: "answer", q: "What do you charge for a lockout in the day?", expect: /\$130/ },
  { type: "answer", q: "What is the phone?", expect: /010-0142/, not: /Shop hours/ },
  { type: "answer", q: "Do you do safes?", expect: /safe opening/i },
  { type: "chat", q: "Hello", expect: /help/i },
  { type: "chat", q: "hi there", expect: /help/i },
  { type: "chat", q: "thanks!", expect: /welcome/i }
];
