// Repo mein: api/image.js   (env: CF_ACCOUNT_ID, CF_API_TOKEN)
module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST" }); }
  const id = process.env.CF_ACCOUNT_ID, tok = process.env.CF_API_TOKEN;
  if (!id || !tok) { console.error("Missing CF_ACCOUNT_ID / CF_API_TOKEN"); return res.status(500).json({ error: "Falguni AI is not set up yet. Please try again later. (E1)" }); }
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const prompt = String(b.prompt || "").trim().slice(0, 800);
    if (!prompt) return res.status(400).json({ error: "Write what you want to see." });
    const models = [["@cf/black-forest-labs/flux-1-schnell", { prompt, steps: 6 }], ["@cf/stabilityai/stable-diffusion-xl-base-1.0", { prompt }]];
    const errs = [];
    for (const [m, body] of models) {
      try {
        const r = await fetch("https://api.cloudflare.com/client/v4/accounts/" + id + "/ai/run/" + m, {
          method: "POST", headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
          body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
        });
        const ct = r.headers.get("content-type") || "";
        if (!r.ok) { const d = await r.json().catch(() => ({})); errs.push(m + ": " + ((d.errors && d.errors[0] && d.errors[0].message) || "HTTP " + r.status)); continue; }
        if (ct.includes("application/json")) {
          const d = await r.json();
          if (d.result && d.result.image) return res.status(200).json({ image: "data:image/jpeg;base64," + d.result.image });
          errs.push(m + ": no image"); continue;
        }
        const buf = Buffer.from(await r.arrayBuffer());
        return res.status(200).json({ image: "data:" + (ct.split(";")[0] || "image/png") + ";base64," + buf.toString("base64") });
      } catch (e) { errs.push(m + ": " + e.message); }
    }
    console.error("image failed:", errs.join(" | "));
    return res.status(502).json({ error: "Could not create the image right now. Try again or change the description. (E4)" });
  } catch (e) {
    console.error("image error:", e.message);
    return res.status(500).json({ error: "Something went wrong. Please try again. (E3)" });
  }
};
