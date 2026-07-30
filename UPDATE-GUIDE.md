# Update — The Yard, the Admin Token, and Email

Three things: push the new files, create your admin token, connect email.

---

# PART 1 — Push the changes to GitHub

Six files changed. **The easy way is to replace all of them at once.**

## Option A — replace everything (recommended, 2 minutes)

1. Unzip `iron-gambit-agents.zip` on your computer.
2. Go to your repo: `github.com/lumondragon990/iron-gambit-agents`
3. Click **Add file** → **Upload files**
4. Open the unzipped `iron-gambit-agents` folder. Select **everything inside it** — the `src` folder, `public` folder, `supabase`, `brand`, `docs`, and the loose files. Drag them into the browser.
5. GitHub will show "X files changed." At the bottom write `the yard: named agents, plates, meeting hall` and click **Commit changes**.

Uploading a file that already exists overwrites it. That's what you want.

## Option B — one file at a time

If you'd rather be surgical, these are the six:

| File | New or replace |
|---|---|
| `public/city.html` | **replace** |
| `src/agents.config.js` | **replace** |
| `src/index.js` | **replace** |
| `src/dashboard.js` | **replace** |
| `src/store.js` | **replace** |
| `src/runner.js` | unchanged, skip |

For each one: open the file in GitHub → click the **pencil** icon (top right of the file view) → click inside the code → **Ctrl+A** (Cmd+A on Mac) to select all → **Delete** → paste the new contents → scroll down → **Commit changes**.

For `public/city.html`, if the `public` folder doesn't exist yet: **Add file** → **Create new file** → type `public/city.html` as the name (the slash creates the folder) → paste → Commit.

## Then watch it deploy

Railway picks up the commit automatically. Open your Railway project → **Deployments**. You'll see a new build. It takes about 60 seconds and goes green when it's live.

If it goes red, click it and read the log — it's nearly always a typo from a partial paste. Re-upload the file.

---

# PART 2 — The admin token

**Nobody gives you this one. You invent it.**

It's not an API key from a company. It's a password you make up that stops strangers from hitting your service and spending your Anthropic credit. Think of it like the code on a garage door — you choose it, and it only has to match itself.

## Make one

Any long random string works. Pick a method:

**Mac / Linux terminal:**
```bash
openssl rand -hex 32
```

**Windows PowerShell:**
```powershell
-join ((48..57)+(97..122) | Get-Random -Count 48 | % {[char]$_})
```

**No terminal:** go to a password generator, set length to 48, no symbols, and copy the result. Or just type 45+ random characters yourself. It doesn't need to be memorable — you'll paste it once and your browser will remember it.

**Bad:** `ironGambit123`, your birthday, anything guessable.
**Good:** `9f3c1a77be04d2e6a8f5c0b93d7142ea5c88f01b6d4e29a7`

## Put it in Railway

1. Railway → your project → click the service
2. **Variables** tab
3. **+ New Variable**
4. Name: `ADMIN_TOKEN`
5. Value: paste your string
6. **Add** — Railway redeploys on its own

Save that string in your password manager. If you lose it, just make a new one and update the variable.

## Use it

Open `https://iron-gambit-agents-production.up.railway.app/admin`, paste the token, hit **Unlock**. Your browser remembers it, and `/city` uses the same one — unlock once and both work.

---

# PART 3 — Connect email

You're skipping Discord, so email is how results reach you. Resend handles it.

## Step 1 — Make the account

Go to **resend.com** → **Sign up**. Free tier is 3,000 emails a month, which is far more than five agents will ever use.

## Step 2 — Verify your domain

This is the part that matters. Sending from an unverified domain lands you in spam folders and starts damaging your reputation before you've sent a single customer an order confirmation.

1. Resend dashboard → **Domains** → **Add Domain**
2. Type `irongambit.com` (or whatever domain you own — if you don't own one yet, see the note below)
3. Resend shows you **three DNS records** to add: one MX and two TXT records (SPF and DKIM)
4. Go to wherever you bought the domain — GoDaddy, Namecheap, Cloudflare — and find the **DNS** or **DNS Records** section
5. Add each record exactly as Resend shows it. Copy and paste the values; don't retype them
6. Back in Resend, click **Verify DNS Records**

It usually verifies in a few minutes. Sometimes it takes an hour. The status turns green when it's done.

> **No domain yet?** Resend gives you a sandbox address you can send *to yourself* with, which is enough to test. But buy the domain before you launch — you need it for the site anyway.

## Step 3 — Get the API key

1. Resend → **API Keys** → **Create API Key**
2. Name: `iron-gambit-agents`
3. Permission: **Sending access**
4. **Add** → copy the key immediately, it's shown once

Starts with `re_`.

## Step 4 — Three variables in Railway

Variables tab → add all three:

```
RESEND_API_KEY=re_your_key_here
MAIL_FROM=command@irongambit.com
DIGEST_TO=your.personal@email.com
```

- `MAIL_FROM` must be **at the domain you verified**. The mailbox part (`command`) doesn't need to exist — Resend sends as it, you don't receive there.
- `DIGEST_TO` is where results land. Use your everyday inbox.

## Step 5 — Test it

Open `/admin` → hit **Run** next to **Sable** (Post-Mortem). It doesn't use web search, so it comes back in about 15 seconds. Check your inbox.

Nothing arrived? Check, in this order:
- Spam folder
- Railway → Deployments → View Logs, look for `[notify] email`
- Resend → **Logs**, which shows every send attempt and why it failed
- Is the domain green in Resend → Domains?

---

# What changed in the yard

**Your agents have names now.** Each one has a person name, a role line, and its own color.

| | | |
|---|---|---|
| **Vega** | Content Engine | Shoots and scripts the week |
| **Quinn** | Copy Desk | Writes everything that is not social |
| **Reyes** | Houston Scout | Finds tables, racks and events |
| **Marisol** | Collab Broker | Finds creators, drafts the ask |
| **Knox** | Drop Commander | Runs the ten-day countdown |
| **Sable** | Post-Mortem | Reads the numbers, names one change |
| **Solomon** | Brand Guardian | Ship, fix, or kill |

Rename any of them in `src/agents.config.js` — change the `person` field. The names in the yard come from the service, so they update everywhere at once.

**Floating name plates** hover over each agent: colored dot, name, colored underline, role, and the actual task they last ran. They scale up when selected and you can click them to follow that agent.

**Light beams** rise from every agent in their own color, breathing slowly.

**Dashed lines** run from each agent to a glowing beacon over the **Meeting Hall** — a new octagonal building in the center of town with a pulsing orb on a spire. Go inside and there's a round table with seven seats and wall screens.

**Room signs** now hang inside every building — glowing plates reading THE IRON HOUSE / STUDIO FLOOR, THE PRESS / PRINT AND FOIL, and so on, with color-coded floor panels underneath.

**It opens at night** so the neon reads. The **Night** button cycles to Day, then to Auto for the moving day/night cycle.

## One deliberate difference from your reference

Your second reference is electric blue and magenta. I used your brand colors instead — the buildings stay obsidian, burgundy, sandstone and gold, and the neon lives in the agent beams and plates.

Blue-and-magenta would look great and look like somebody else's brand. Iron Gambit is gold on dark, and the whole point of a command view is that it feels like *your* company.

If you want the blue/magenta anyway, it's one line — say the word and I'll switch the palette.
