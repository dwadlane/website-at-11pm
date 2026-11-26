# Brief: Your Website At 11 PM

Plain-English notes so you can explain each choice on a call. Everything on the page is a demo with sample data. The business (Lantern Hill Lock & Key) is made up.

## The one-sentence pitch

A customer texts an Owner's website after hours. A small language model running inside the visitor's own browser answers from the facts the Owner typed in, and says a person will confirm anything else. No server, no per-message bill.

## Who it is for

Established service business Owners in English markets who lose customers to slow follow-up on calls and messages. The hook is the gap: closed at 5 PM, customer shops at 11 PM, and the one that answers first wins.

## Decisions and why

**Run the model in the browser (web-llm).** The cost to the Owner for running it is zero because the visitor's own device does the work. It is a good demo of "no server, no API bill." It is a poor fit if you need the same quality as the big hosted models. Say so out loud.

**Smallest usable model: Qwen2.5 1.5B Instruct, 4-bit, about 880 MB.** I tried the smaller 0.5B (about 880 MB) first. It was fast, but it did not stick to the facts: with the plain prompt it handed off 0 of 12 unknown questions (it made up answers, including "we accept checks" and "yes, we serve Riverside County"). With a tuned prompt it reached 4 of 12. That is not usable, so I moved up to 1.5B, which is Apache 2.0, not gated, and no login. Cost of the move: a bigger first download (about 880 MB, about 9 minutes on my connection) and a slower reply (about 1.7 s). I did not try other model families, so I cannot claim 1.5B is the best small model, only the smallest I tried that was usable.

**Facts-only prompt, temperature 0.** The system prompt says: use only the facts, give a fixed sentence when unsure, never invent numbers, plus a short example about an imaginary salon. Temperature 0 makes answers repeatable, which matters for testing.

**Two plain-rule checks around the model (ordinary code, not AI).** First, a fact-match gate in front: if no line of the facts matches the customer's question, the page hands off straight away and never asks the model. That is what lifted unknown-question hand-offs from 9 of 12 to 11 of 12 on the 1.5B model. Second, a number check behind: if a reply contains a number that appears nowhere in the facts or the question, the page swaps in the hand-off sentence. Limits: the gate can hand off too eagerly (it is strict about words it has not seen), and the number check misses an invented number that also appears somewhere else in the facts. The page shows a visible note whenever a check changes a reply.

**Honest test numbers on the page.** I wrote 24 scripted questions: 12 where the facts hold the answer, 12 where they do not. The final scores (1.5B model with both checks, run on 2026-11-06 in headless Chromium on a Mac with WebGPU): answered known questions correctly 10 of 12, handed off unknown questions 11 of 12, median model reply about 1.7 s. Two honest caveats. I tuned the prompt and the gate while looking at these same 24 questions, so the score is probably better than what real customers will see. And grading is automatic and strict, so a reasonable answer in different words can count as a miss. For example the one unknown-question miss ("How much to open my safe?") is a reply that asks for details, while the facts do say safes are quoted after seeing the job. The full transcript is in `docs/model-eval-transcript.json`, and earlier runs are kept in the other transcript files so you can see the 0.5B results.

**Real timer.** The reply time is measured with the browser clock from the moment you press Send to the end of the reply, plus time to the first word. Nothing is hardcoded. It depends on the visitor's device, so your numbers on a call will differ from mine.

**Simulated clock.** The "11:07 PM" badge is labeled "simulated time." It is not the visitor's clock.

**Instant mode (the fallback).** Many browsers cannot run the model (no WebGPU: older browsers, some phones, most Firefox and Safari setups today). Instead of a dead page, the chat still works with a simple keyword lookup over the same facts. It is labeled "not AI" on screen, and its timer is labeled so nobody mistakes it for model speed. It is also what runs while the 880 MB model downloads. On the same 24 questions it answers 11 of 12 known questions and hands off 11 of 12 unknown ones, though it only finds and repeats lines from the facts, it never writes a sentence.

**The large first download.** The page does not download anything until the visitor presses the button, and says the size first. It shows a progress bar and percent. After the first time the browser keeps the files (on my machine the second start took 1 to 2 seconds).

**Where the model files come from.** Model weights are served from Hugging Face (public, no login, no cost to us). The compiled GPU program comes from the web-llm project's GitHub repository. Both are third parties: if either is down or changes, the model path breaks. Visitors' browsers contact those two hosts when they press the button. A production version should copy those files to the Owner's own hosting.

**Self-hosted fonts, no tracking.** Fonts are bundled. There are no analytics scripts.

**What web-llm is, and what is new here.** web-llm (Apache 2.0, from the MLC AI project) is the engine that runs models in the browser. Everything else here is new: the page, the prompt, the facts editor, the hand-off wording, the safety check, Instant mode, the timer, the test harness, and the design.

## What to say if asked

- "Does it replace a person?" No. It gives a first answer at 11 PM and hands off what it does not know.
- "Can it be wrong?" Yes. The page says so, and the test numbers show how often.
- "What would a real version need?" The Owner's own facts, a place to send the hand-off (text or email to the Owner), the model files on the Owner's hosting, and a check on real customer questions before launch.
- "Does it work on phones?" The page does. The model needs WebGPU, which many phones lack. Those visitors get Instant mode. I did not test the model on a phone, and I did not test the 32-bit fallback variant for GPUs without shader-f16.

## Next step for a buyer

14-Day Business Diagnosis: https://gaps2gains.com/diagnosis
