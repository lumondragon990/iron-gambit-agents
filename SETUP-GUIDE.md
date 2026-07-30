# Iron Gambit — Setup, Step by Step

Three parts. Do them in order.

1. Remove the AI agents from the website
2. Push the fixed logo live
3. Stand the agents up on their own server

---

# PART 1 — Remove the agents from the website

**Already done in the zip.** Download `iron-gambit.zip` and the agents are gone. Skip to Part 2 unless your repo is already live and you want to edit it in place.

### If you already deployed and want to strip it out yourself

**1. Delete two files.** In your GitHub repo, open `agents3d.html` → trash icon → **Commit changes**. Repeat for `agents.html`.

**2. Remove the nav link.** Open `index.html` → pencil icon. Find:

```html
<a href="agents3d.html">Command</a>
```

Delete that whole line. It sits between the Houston link and the closing `</div>`.

**3. Remove the Command section.** Search the file for `<!-- COMMAND TEASER -->`. Delete everything from that comment down to and including the `</section>` that follows it — about 20 lines, ending just before `<!-- LOOKBOOK -->`.

**4. Remove the footer link.** Find the `foot-links` row and delete `<a href="agents3d.html">Command</a>` from inside it. Leave the others.

**5. Commit.** Vercel redeploys in about twenty seconds.

**How to check it worked:** load your site in a private window. The nav should read Royal Series, Creed, Houston. Visiting `/agents3d` should 404.

---

# PART 2 — The logo

Your real logo is now vector-traced into the page as one shared `<symbol>`, filled with `currentColor` so it renders gold on dark backgrounds and dark on cream ones. It appears in nine places — nav, hero crest, six product cards, footer — and all nine come from that one definition.

**To deploy it:** replace `index.html` in your repo with the one from `iron-gambit.zip`, and upload the `assets/` folder. That's it.

### Step by step in GitHub

1. Repo → `index.html` → pencil icon → select all → paste the new file → **Commit changes**
2. Repo home → **Add file** → **Upload files** → drag the whole `assets` folder in → **Commit**
3. Wait for the Vercel check to go green

**Verify:** hard-refresh the site (Cmd/Ctrl + Shift + R). The barbell should have both plate stacks, the king should have its crown and cross, and there should now be a small gold icon in the browser tab.

### If you get a cleaner vector later

Open `index.html`, find `<symbol id="crest"`, and replace only the `d="..."` value inside it. Don't touch the `viewBox` unless the new art has different proportions. All nine instances update at once.

---

# PART 3 — Standing up the agents

The agents live in a **second repo on a different host**. They can't live with the website because the website is static files anyone can read the source of, and these need secret keys plus a server that stays awake to run on a schedule.

```
irongambit.com        Vercel     public site, zero secrets
iron-gambit-agents    Railway    always on, cron jobs, holds every key
```

Budget about **45 minutes** for the whole thing. Collect the keys first, deploy last.

---

## Key 1 — Anthropic (required)

This is what makes the agents think and search.

1. Go to **console.anthropic.com** and sign in. This is a *separate* account from your Claude subscription — a Claude Pro plan does not include API credit.
2. Left sidebar → **Billing** → add a payment method and buy a starter credit. **$20 will last you months** at this volume.
3. Left sidebar → **API Keys** → **Create Key** → name it `iron-gambit-agents` → **Copy**.
4. Paste it somewhere safe right now. The console will never show it again.

Starts with `sk-ant-`. → `ANTHROPIC_API_KEY`

**Set a spend cap while you're in there.** Billing → Usage limits. Put it at $25/month. If a bug ever puts an agent in a loop, that cap is the only thing standing between you and a surprise bill.

---

## Key 2 — Supabase (required)

Where the agents write what they found. You already have a Supabase account from Shelf Life.

1. **supabase.com** → dashboard → **New project**. Name it `iron-gambit`. Pick a region near Houston (us-east-1 or us-west-1). Set a database password and save it.
2. Wait ~2 minutes for provisioning.
3. Left sidebar → **SQL Editor** → **New query**. Open `supabase/schema.sql` from the agents zip, paste the whole thing in, hit **Run**. You should see "Success. No rows returned."
4. Left sidebar → **Settings** (gear) → **API**.
   - Copy **Project URL** → `SUPABASE_URL`
   - Under Project API keys, reveal **`service_role`** → copy → `SUPABASE_SERVICE_KEY`

**The `service_role` key bypasses all row-level security.** It belongs on your server and nowhere else — never in a browser, never in the website repo, never in a screenshot.

---

## Key 3 — Discord webhook (required, and the easiest)

This is how the agents reach your phone. Two minutes, no OAuth, no app review.

1. Open Discord. If you don't have a server, click **+** in the left rail → **Create My Own** → **For me and my friends** → name it `Iron Gambit`.
2. Create a channel called `#command`.
3. Hover the channel → gear icon → **Integrations** → **Webhooks** → **New Webhook**.
4. Name it `Command`, make sure the channel is `#command`, click **Copy Webhook URL**.
5. Install Discord on your phone and turn notifications on for that channel.

Starts with `https://discord.com/api/webhooks/`. → `DISCORD_WEBHOOK_URL`

Now every agent run buzzes your pocket.

---

## Key 4 — Resend (optional for now)

Only needed for the weekly email digest and for actually sending approved outreach. **Skip this on day one** — Discord covers notifications and you shouldn't be sending outreach in week one anyway.

When you're ready:

1. **resend.com** → sign up free (3,000 emails/month).
2. **Domains** → **Add Domain** → enter `irongambit.com`.
3. Resend gives you three DNS records (an MX and two TXT — SPF and DKIM). Add them at your registrar. Wait for verification, usually under an hour.
4. **API Keys** → **Create API Key** → permission **Sending access** → copy.

→ `RESEND_API_KEY`, and set `MAIL_FROM=command@irongambit.com`

**You must verify the domain.** Sending from an unverified domain lands you in spam and starts damaging your sender reputation before you've sent a single real customer an order confirmation.

---

## Key 5 — Admin token (make it up)

Protects the endpoints that spend money and send mail. Generate one:

```bash
openssl rand -hex 32
```

Or just mash 40+ random characters. → `ADMIN_TOKEN`

---

## Deploy to Railway

**1. Put the code on GitHub.**

Unzip `iron-gambit-agents.zip`. Then either drag the *contents* into a new repo via **Add file → Upload files**, or:

```bash
cd iron-gambit-agents
git init
git add .
git commit -m "Iron Gambit agents"
git branch -M main
git remote add origin https://github.com/lumondragon990/iron-gambit-agents.git
git push -u origin main
```

Make the repo **Private**. It doesn't contain keys — `.gitignore` blocks `.env` — but there's no reason for it to be public.

**2. Deploy.**

1. **railway.app** → sign in with GitHub → **New Project** → **Deploy from GitHub repo**
2. Pick `iron-gambit-agents`. Railway detects Node and builds automatically.
3. Open the service → **Variables** tab → **Raw Editor** → paste this with your real values:

```
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-5
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
ADMIN_TOKEN=your-long-random-string
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TIMEZONE=America/Chicago
AUTO_SEND_OUTREACH=false
```

**Do not add `PORT`.** Railway sets it, and overriding it is exactly what crashed your Two Disciples deploy.

4. **Settings** → **Networking** → **Generate Domain**. You'll get something like `iron-gambit-agents-production.up.railway.app`.

**3. Confirm it's alive.**

Open `https://your-app.up.railway.app/health` in a browser. You want:

```json
{"ok":true,"agents":5,"tz":"America/Chicago"}
```

**4. Fire one agent by hand.**

```bash
curl -X POST https://your-app.up.railway.app/run/scout \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

Give it 30–60 seconds — it's genuinely searching the web. You should get a Discord notification with scored Houston opportunities, and rows in your Supabase `events` table.

**If that works, you're done.** Scout now runs itself every Monday at 9am Houston time.

---

## Turn one on, not five

Comment out every agent except **Houston Scout** in `src/agents.config.js` — set `schedule: null` on the others. Let Scout run for two weeks.

If what it finds is actually worth your Saturday, add Collab Broker. If it returns junk, the fix is the prompt, and you want to learn that on one agent instead of five at once.

---

## The approval queue

Collab Broker **drafts** outreach and parks it. Nothing sends until you say so:

```bash
# see what's waiting
curl https://your-app.up.railway.app/outbox -H "x-admin-token: ..."

# send #12
curl -X POST https://your-app.up.railway.app/outbox/12/approve -H "x-admin-token: ..."

# bin #13
curl -X POST https://your-app.up.railway.app/outbox/13/reject -H "x-admin-token: ..."
```

Leave `AUTO_SEND_OUTREACH=false`. A new domain that starts firing unsolicited email gets blocklisted, and once `irongambit.com` is flagged your *order confirmations* stop landing too. Five minutes of your eyes on Wednesday is worth more than the automation you'd save.

---

## Every endpoint

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/health` | — | is it up |
| GET | `/agents` | — | roster and schedules |
| GET | `/runs` | admin | last 40 runs |
| POST | `/run/:id` | admin | trigger now |
| GET | `/outbox` | admin | pending drafts |
| POST | `/outbox/:id/approve` | admin | send it |
| POST | `/outbox/:id/reject` | admin | bin it |

Auth means the header `x-admin-token: YOUR_ADMIN_TOKEN`.

---

## When something breaks

**`/health` returns nothing** — Railway → Deployments → View Logs. Nearly always a missing variable.

**No Discord message** — regenerate the webhook; they die if the channel is deleted. Test it:
```bash
curl -X POST "$DISCORD_WEBHOOK_URL" -H "Content-Type: application/json" -d '{"content":"test"}'
```

**"Supabase not configured" in the logs** — the URL or service key is wrong. The URL has no trailing slash. The key is the long `service_role` one, not `anon`.

**401 on `/run/scout`** — the token doesn't match. Check for a trailing space in the Railway variable.

**Anthropic 401** — key wrong, or you have no credit. Console → Billing.

**Cron never fires** — Railway free tier sleeps idle services. That's what the $5 Hobby plan is for; a sleeping service misses its schedule.

---

## Costs, verified July 2026

| Service | Monthly |
|---|---|
| Anthropic API | $2–5 |
| Railway Hobby | $5 |
| Supabase | free |
| Resend | free under 3,000 emails |
| Discord | free |

Around **$10/month**. Rates change — check https://www.anthropic.com/pricing before you commit.
