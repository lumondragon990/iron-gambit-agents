# Iron Gambit — Agents

The crew that actually runs. Separate repo, separate host from the website.

## Why this is separate from the site

The website is static HTML on Vercel. Anything in it is public — view source and you have it. This service needs an Anthropic key, a Supabase service key and a mail key, and it needs to wake up on a schedule and do work while nobody is watching. That is a server, not a web page.

```
irongambit.com          Vercel      static, public, no secrets
  └─ /agents3d          the Command visualisation

iron-gambit-agents      Railway     always-on, cron, holds every API key
  ├─ Anthropic API      thinking + web search
  ├─ Supabase           agent_runs, events, outbox
  ├─ Resend             the digest, and approved outreach only
  └─ Discord webhook    phone notifications
```

Later, the Command page can read from Supabase and show real runs instead of a simulation. That is the payoff for splitting them now.

---

## What each agent actually does

| Agent | Runs | Web search | What comes out |
|---|---|---|---|
| **Houston Scout** | Mon 9am | yes | 8–12 scored opportunities into the `events` table, deadlines inside 14 days flagged |
| **Content Engine** | Sun 10am | no | Five pieces of content for the week |
| **Collab Broker** | Wed 11am | yes | Five creators found and drafted into the **approval queue** |
| **Post-Mortem** | Fri 4pm | no | Four-part read on the week's numbers |
| **Brand Guardian** | on demand | no | SHIP / FIX / KILL on anything you paste it |

Every run is stored, and every run pings your phone.

---

## Setup

**1. Supabase.** Open your project → SQL Editor → paste `supabase/schema.sql` → Run. Grab the project URL and the `service_role` key from Settings → API.

**2. Discord notifications** (two minutes, easiest option). Server Settings → Integrations → Webhooks → New Webhook → copy the URL. Now every agent run hits your phone.

**3. Resend** (optional, needed for the digest and for sending approved outreach). Sign up, verify your domain, create an API key.

**4. Anthropic.** Get a key at console.anthropic.com.

**5. Deploy.**

```bash
git init && git add . && git commit -m "agents"
git remote add origin https://github.com/lumondragon990/iron-gambit-agents.git
git push -u origin main
```

Railway → New Project → Deploy from GitHub → pick the repo → Variables tab → paste everything from `.env.example` with real values. Railway sets `PORT` itself, so don't add it.

**6. Check it.** Open `https://your-app.up.railway.app/` for the status page, then `/admin` to log in with your `ADMIN_PIN` and run agents from the browser.

### Running one by hand

```bash
npm install
cp .env.example .env        # fill it in
npm run                     # lists the agents
npm run scout               # runs Houston Scout right now
npm run guard "Our new hoodie is INSANE 🔥🔥"
```

Or against the deployed service:

```bash
curl -X POST https://your-app.up.railway.app/run/scout \
  -H "x-admin-pin: YOUR_ADMIN_PIN"
```

---

## The approval queue — read this part

`AUTO_SEND_OUTREACH` is `false` and it should stay that way.

Collab Broker **drafts** outreach and parks it in the `outbox` table as `pending`. Nothing leaves the building until you approve it:

Easiest way is the dashboard at `/admin` — each draft shows up with **Send** and **Reject** buttons. Or by hand:

```bash
curl https://your-app.up.railway.app/outbox -H "x-admin-pin: ..."
curl -X POST https://your-app.up.railway.app/outbox/12/approve -H "x-admin-pin: ..."
curl -X POST https://your-app.up.railway.app/outbox/13/reject  -H "x-admin-pin: ..."
```

**Why a human gate, and not just automation:**

- **Deliverability.** A brand-new domain that starts firing unsolicited email gets flagged fast. Once `irongambit.com` is on a blocklist your order confirmations stop landing in inboxes too. That is a hard problem to undo and it costs you real sales.
- **The law.** US CAN-SPAM requires a real physical address and a working unsubscribe on commercial email. Volume cold outreach without those is a liability, and other countries are stricter.
- **It works better.** The creators worth having will notice a generic AI email instantly. Thirty seconds of your eyes on a draft is the difference between a reply and a block.

The genuinely good version of this: let the agent do the finding and the drafting — the slow, boring 90% — and you spend five minutes a week approving. For anyone without a public email, send it as a DM yourself. DMs outperform email for creator outreach anyway.

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | — | status page |
| GET | `/admin` | — | browser dashboard |
| GET | `/city` | — | 3D view of the crew, live data |
| GET | `/state` | admin | agent state as JSON |
| GET | `/health` | — | is it up |
| GET | `/agents` | — | roster and schedules |
| GET | `/runs` | admin | last 40 runs |
| POST | `/run/:id` | admin | trigger now; body `{"data":"..."}` for guard and analyst |
| GET | `/outbox` | admin | pending drafts |
| POST | `/outbox/:id/approve` | admin | send it |
| POST | `/outbox/:id/reject` | admin | bin it |

Auth is the `x-admin-pin` header matching `ADMIN_PIN`.

---

## Cost

About 12 scheduled runs a month. The searching agents cost more because search pulls a lot of text into context.

Verified rates as of July 2026:

| Model | Input | Output |
|---|---|---|
| `claude-sonnet-5` | $2.00 / MTok | $10.00 / MTok |
| `claude-haiku-4-5-20251001` | $1.00 / MTok | $5.00 / MTok |
| `claude-opus-5` | $5.00 / MTok | $25.00 / MTok |

Sonnet 5 is on an introductory rate through 31 August 2026, then goes to $3/$15. Web search is billed separately per search on top of tokens.

Realistic monthly total at this volume:

- Anthropic: **$2–5**
- Railway Hobby: **$5**
- Supabase: **free tier is plenty**
- Resend: **free** up to 3,000 emails/month
- Discord: **free**

**Under $12/month.** Keep `CLAUDE_MODEL=claude-sonnet-5`. Opus 5 is more than twice the price and none of this work needs it. Check current rates at https://www.anthropic.com/pricing before you budget — they move.

## Start with one

Do not turn all five on in week one. Comment out everything except **Houston Scout**, let it run for two weeks, and see whether the opportunities it finds are actually worth your Saturday. If they are, add Collab Broker. If Scout returns junk, the fix is the prompt, and you want to learn that on one agent instead of five.

The `schedule: null` on an agent means it never fires on its own — that is how Brand Guardian is set up, and it is the easiest way to park one.
