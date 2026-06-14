// NOWPayments relay — runs on Render (or any host with a static outbound IP).
// Receives signed requests from the Rollit Worker and forwards them to NOWPayments.
// Whitelist this host's outbound IP in NOWPayments → Security → IP whitelist.

import express from "express";

const app = express();
app.use(express.json({ limit: "256kb" }));

const SECRET = process.env.RELAY_SECRET;
const NP_BASE = "https://api.nowpayments.io/v1";

if (!SECRET) {
  console.error("RELAY_SECRET env var is required");
  process.exit(1);
}

// Only allow forwarding to these NOWPayments paths (least-privilege).
const ALLOWED = [
  /^\/auth$/,
  /^\/payout$/,
  /^\/payout\/[A-Za-z0-9-]+\/verify$/,
];

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/forward", async (req, res) => {
  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${SECRET}`) return res.status(401).json({ error: "unauthorized" });

  const { path, method = "POST", headers = {}, body } = req.body || {};
  if (typeof path !== "string" || !ALLOWED.some((r) => r.test(path))) {
    return res.status(400).json({ error: "path_not_allowed", path });
  }

  try {
    const upstream = await fetch(`${NP_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body == null ? undefined : (typeof body === "string" ? body : JSON.stringify(body)),
    });
    const text = await upstream.text();
    res.status(upstream.status)
       .set("Content-Type", upstream.headers.get("content-type") || "application/json")
       .send(text);
  } catch (e) {
    res.status(502).json({ error: "upstream_failed", message: String(e?.message || e) });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Relay listening on :${port}`));
