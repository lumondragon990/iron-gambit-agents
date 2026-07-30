import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { AGENTS, byId } from './agents.config.js';
import { runAgent } from './runner.js';
import { listOutbox, setOutboxStatus, recentRuns, worldState } from './store.js';
import { sendOutreach, notify } from './notify.js';
import { statusPage, adminPage } from './dashboard.js';
import { readFile } from 'node:fs/promises';

const app = express();
app.use(express.json());

const TZ = process.env.TIMEZONE || 'America/Chicago';

/* --- auth for anything that costs money or sends mail --- */
function admin(req, res, next) {
  const t = req.get('x-admin-token') || req.query.token;
  if (!process.env.ADMIN_TOKEN || t !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'bad or missing admin token' });
  }
  next();
}

/* Root: a plain status page so the service does not answer "Cannot GET /". */
app.get('/', (_, res) => res.type('html').send(
  statusPage(AGENTS.map(a => ({
    name: a.name, person: a.person, role: a.role, color: a.color,
    schedule: a.schedule, search: !!a.search
  })), TZ)
));

/* Browser dashboard. The page itself is harmless; every call it makes needs the token. */
app.get('/admin', (_, res) => res.type('html').send(adminPage()));

/* The 3D city. Internal tool — lives here, not on the storefront. */
app.get('/city', async (_, res) => {
  try { res.type('html').send(await readFile('public/city.html', 'utf8')); }
  catch { res.status(500).send('city.html missing from public/'); }
});

/* Live state for the city view. */
app.get('/state', admin, async (_, res) => {
  const w = await worldState();
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

  const agents = AGENTS.map(a => {
    const mine = w.runs.filter(r => r.agent === a.id);
    const last = mine[0];
    return {
      id: a.id,
      name: a.name,
      person: a.person || a.name,
      role: a.role || '',
      color: a.color || '#D8B678',
      schedule: a.schedule,
      search: !!a.search,
      last_run: last ? last.created_at : null,
      minutes_since: last ? Math.round((now - new Date(last.created_at)) / 60000) : null,
      last_task: last ? firstLine(last.output) : null,
      runs_total: mine.length,
      runs_today: mine.filter(r => new Date(r.created_at) >= startOfDay).length
    };
  });

  res.json({
    live: w.live,
    server_time: new Date().toISOString(),
    tz: TZ,
    agents,
    recent: w.runs.slice(0, 30).map(r => ({
      id: r.id, agent: r.agent, trigger: r.trigger,
      at: r.created_at, text: firstLine(r.output)
    })),
    counts: w.counts
  });
});

function firstLine(out) {
  if (!out) return null;
  const line = out.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
  return line.replace(/^[#>*\-\s]+/, '').slice(0, 150);
}

app.get('/health', (_, res) => res.json({ ok: true, agents: AGENTS.length, tz: TZ }));

app.get('/agents', (_, res) => res.json(
  AGENTS.map(a => ({
    id: a.id, name: a.name, person: a.person, role: a.role,
    color: a.color, schedule: a.schedule, search: !!a.search
  }))
));

app.get('/runs', admin, async (_, res) => res.json(await recentRuns(40)));

/* Manual trigger: POST /run/scout  (header x-admin-token) */
app.post('/run/:id', admin, async (req, res) => {
  const agent = byId(req.params.id);
  if (!agent) return res.status(404).json({ error: 'unknown agent' });
  try {
    const out = await runAgent(agent, { trigger: 'manual', data: req.body?.data || '' });
    res.json({ ok: true, agent: agent.id, summary: out.summary });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* --- the approval queue --- */
app.get('/outbox', admin, async (_, res) => res.json(await listOutbox('pending')));

app.post('/outbox/:id/approve', admin, async (req, res) => {
  const rows = await listOutbox('pending');
  const row = rows.find(r => String(r.id) === req.params.id);
  if (!row) return res.status(404).json({ error: 'not found or already handled' });
  if (!row.to_email) return res.status(400).json({ error: 'no email address — send this one as a DM by hand' });
  try {
    await sendOutreach(row);
    await setOutboxStatus(row.id, 'sent', { sent_at: new Date().toISOString() });
    res.json({ ok: true, sent_to: row.to_email });
  } catch (e) {
    await setOutboxStatus(row.id, 'failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

app.post('/outbox/:id/reject', admin, async (req, res) => {
  const r = await setOutboxStatus(req.params.id, 'rejected');
  res.json({ ok: !!r });
});

/* --- schedules --- */
for (const a of AGENTS) {
  if (!a.schedule) continue;
  cron.schedule(a.schedule, async () => {
    console.log(`[cron] ${a.id}`);
    try { await runAgent(a, { trigger: 'cron' }); }
    catch (e) {
      console.error(`[cron] ${a.id} failed`, e.message);
      await notify(`${a.name} failed`, e.message);
    }
  }, { timezone: TZ });
  console.log(`[cron] ${a.id.padEnd(10)} ${a.schedule}  (${TZ})`);
}

app.use((req, res) => res.status(404).json({
  error: 'no such route',
  try: ['/', '/admin', '/health', '/agents']
}));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Iron Gambit Command listening on ${port}`));
