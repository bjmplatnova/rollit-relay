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

/** Discover the outbound IP(s) this host uses for upstream requests.
 *  Call this after deploying, then whitelist the returned IP(s) in NOWPayments.
 */
app.get("/discover-ip", async (_req, res) => {
  const services = [
    "https://api.ipify.org?format=json",
    "https://ifconfig.me/all.json",
    "https://checkip.amazonaws.com",
  ];
  const results = [];
  for (const url of services) {
    try {
      const r = await fetch(url, { timeout: 5000 });
      if (!r.ok) continue;
      const text = (await r.text()).trim();
      const ip = text.includes("{")
        ? (JSON.parse(text).ip ?? JSON.parse(text).ip_addr ?? "")
        : text;
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) results.push(ip);
    } catch (e) {
      // ignore individual service failures
    }
  }
  const unique = [...new Set(results)];
  res.json({ ips: unique, sourcesChecked: services.length });
});


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
