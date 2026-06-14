# NOWPayments Relay

Tiny Express service that gives your NOWPayments payout calls a **static outbound IP** so you can whitelist it in NOWPayments → Security.

## Deploy on Render (free tier works)

1. Push this `relay/` folder to a new GitHub repo (or upload as a zip).
2. Render dashboard → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory**: `relay` (if using the rollit monorepo) or leave blank if it's its own repo
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Add **Environment Variable**:
   - `RELAY_SECRET` = a long random string (generate with `openssl rand -hex 32`). Save the value — you'll paste it into Lovable next.
5. Deploy. Once live, note the URL (e.g. `https://rollit-relay.onrender.com`).
6. In Render → your service → **Connect** tab → copy the **Outbound IPs** (usually 3 addresses).
7. NOWPayments dashboard → **Security → IP whitelist** → add all 3 outbound IPs.
8. Health check: open `https://your-relay.onrender.com/healthz` — should return `{"ok":true}`.

## Tell Lovable the URL + secret

Send back to chat:
- `NOWPAYMENTS_RELAY_URL` = `https://your-relay.onrender.com`
- `NOWPAYMENTS_RELAY_SECRET` = the same random string from step 4
