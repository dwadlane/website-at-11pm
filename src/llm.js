// web-llm is loaded on demand so the page itself stays small.
const webllm = () => import("@mlc-ai/web-llm");

// Smallest model tried that stuck to the facts well enough (see README). Apache 2.0, not gated: Qwen2.5 1.5B Instruct, 4-bit. (The 0.5B version was tried first and was not good enough, see README.)
export const MODEL_F16 = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC"; // about 880 MB, needs shader-f16
export const MODEL_F32 = "Qwen2.5-1.5B-Instruct-q4f32_1-MLC"; // same download size, more GPU memory, not tested here

export async function detectWebGPU() {
  if (!window.isSecureContext) return { ok: false, reason: "This page is not in a secure context (needs https or localhost)." };
  if (!("gpu" in navigator)) return { ok: false, reason: "This browser does not offer WebGPU." };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { ok: false, reason: "WebGPU is present but no graphics adapter was available." };
    const f16 = adapter.features.has("shader-f16");
    // ?model=<id> is a test hook so the scripted tests can compare models. The page itself never sets it.
    const forced = new URLSearchParams(location.search).get("model");
    return { ok: true, modelId: forced || (f16 ? MODEL_F16 : MODEL_F32), f16 };
  } catch (e) {
    return { ok: false, reason: "WebGPU failed to start: " + (e && e.message ? e.message : e) };
  }
}

export async function isCached(modelId) {
  try { return await (await webllm()).hasModelInCache(modelId); } catch { return false; }
}

let engine = null;
export async function loadModel(modelId, onProgress) {
  const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  engine = await (await webllm()).CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (p) => onProgress({ progress: p.progress, text: p.text })
  });
  return engine;
}

// Streams a reply. Times are measured with performance.now(), nothing is estimated.
export async function chat(messages, onToken) {
  const t0 = performance.now();
  let tFirst = null, text = "", usage = null;
  const stream = await engine.chat.completions.create({
    messages, temperature: 0, max_tokens: 120, stream: true, stream_options: { include_usage: true }
  });
  for await (const chunk of stream) {
    const d = chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
    if (d) { if (tFirst === null) tFirst = performance.now(); text += d; onToken(text, performance.now() - t0); }
    if (chunk.usage) usage = chunk.usage;
  }
  const tEnd = performance.now();
  return {
    text, totalMs: tEnd - t0, firstMs: tFirst === null ? null : tFirst - t0,
    tokens: usage ? usage.completion_tokens : null,
    decodeTps: usage && usage.extra ? usage.extra.decode_tokens_per_s : null
  };
}
