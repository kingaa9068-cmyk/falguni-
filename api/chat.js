// Repo mein: api/chat.js   (Vercel env: CF_ACCOUNT_ID, CF_API_TOKEN, TAVILY_API_KEY optional)
const TEXT = ["@cf/zai-org/glm-4.7-flash", "@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct"];
const VISION = ["@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/mistralai/mistral-small-3.1-24b-instruct", "@cf/meta/llama-3.2-11b-vision-instruct"];

async function run(model, messages) {
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + process.env.CF_ACCOUNT_ID + "/ai/run/" + model, {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.CF_API_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ messages, max_tokens: 2048 }),
    signal: AbortSignal.timeout(20000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.success === false) throw new Error((d.errors && d.errors[0] && d.errors[0].message) || "HTTP " + r.status);
  const x = d.result || {};
  let t = typeof x.response === "string" ? x.response : (x.choices && x.choices[0] && x.choices[0].message && x.choices[0].message.content) || "";
  t = String(t).replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!t) throw new Error("empty reply");
  return t;
}

async function webSearch(q) {
  const k = process.env.TAVILY_API_KEY;
  if (!k) return null;
  const r = await fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + k },
    body: JSON.stringify({ query: q.slice(0, 300), max_results: 5 }), signal: AbortSignal.timeout(12000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("search HTTP " + r.status);
  return (d.results || []).slice(0, 5).map((x) => ({ title: String(x.title || "").slice(0, 120), url: x.url, snippet: String(x.content || "").slice(0, 500) }));
