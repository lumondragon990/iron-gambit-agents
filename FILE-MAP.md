# File map

Every file, what it does, and whether you need to touch it.

| File | Purpose | You edit? |
|---|---|---|
| `src/index.js` | Express server, routes, PIN auth with lockout, cron schedules | no |
| `src/agents.config.js` | **The ten agents** — names, roles, colours, schedules, prompts | **yes** |
| `src/runner.js` | Runs an agent, saves the result, sends the notification | no |
| `src/claude.js` | Anthropic API wrapper, incl. web search | no |
| `src/store.js` | Supabase reads and writes | no |
| `src/notify.js` | Email and Discord delivery | no |
| `src/dashboard.js` | The Status, Admin and Work pages | no |
| `src/logo.js` | Your crest, vector-traced | no |
| `src/cli.js` | Run an agent from a terminal | no |
| `public/city.html` | The 3D yard | no |
| `public/vendor/three.min.js` | 3D engine, self-hosted so nothing loads from outside | never |
| `public/favicon.svg` | Browser tab icon | no |
| `brand/BRAND.md` | Brand core the agents read on every run | **yes** |
| `supabase/schema.sql` | Database tables. Run once in Supabase | run once |
| `tools/audit-city.py` | Catches the bug class that broke the city three times | run after edits |
| `.env.example` | The variables you set in Railway | reference |

## Railway variables

Required:

    ANTHROPIC_API_KEY=sk-ant-...
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY=eyJ...
    ADMIN_PIN=4729
    CLAUDE_MODEL=claude-sonnet-5
    TIMEZONE=America/Chicago

Email, once you want the digest:

    RESEND_API_KEY=re_...
    MAIL_FROM=onboarding@resend.dev
    DIGEST_TO=you@outlook.com

Never set `PORT`. Railway provides it.

## Pages

| URL | What it is |
|---|---|
| `/` | Status. Public, shows nothing sensitive |
| `/admin` | PIN keypad, then Run buttons for every agent |
| `/work` | Leads, Content, Outreach, Everything |
| `/city` | The 3D yard |
| `/health` | Diagnostics — check this first when anything looks wrong |
