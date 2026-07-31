import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { AGENTS, byId } from './agents.config.js';
import { runAgent } from './runner.js';
import { listOutbox, setOutboxStatus, recentRuns, worldState,
         listEvents, setEventStatus, getRun } from './store.js';
import { sendOutreach, notify } from './notify.js';
import { statusPage, adminPage, workPage } from './dashboard.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/* Resolve from this file, not from wherever the process happened to start. */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(HERE, '..', 'public');

const app = express();
app.use(express.json());

const TZ = process.env.TIMEZONE || 'America/Chicago';

/* ---------------------------------------------------------------
   Auth: a short PIN, protected by lockout.

   A 4-digit PIN is only 10,000 combinations, which a script can walk
   through in seconds. What makes it safe enough here is the lockout
   below: five wrong tries and that IP is frozen for fifteen minutes,
   which turns a seconds-long attack into a multi-year one.
   --------------------------------------------------------------- */
const PIN = (process.env.ADMIN_PIN || '').trim();
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;
const tries = new Map();               // ip -> { n, until }

function clientIp(req) {
  return (req.get('x-forwarded-for') || '').split(',')[0].trim() || req.ip || 'unknown';
}

function admin(req, res, next) {
  const ip = clientIp(req);
  const rec = tries.get(ip) || { n: 0, until: 0 };

  if (rec.until > Date.now()) {
    return res.status(429).json({
      error: 'too many wrong attempts',
      retry_in_seconds: Math.ceil((rec.until - Date.now()) / 1000)
    });
  }

  if (!PIN) {
    return res.status(503).json({
      error: 'ADMIN_PIN is not set on the server',
      fix: 'Add an ADMIN_PIN variable in Railway, then wait for the redeploy.'
    });
  }

  const given = String(req.get('x-admin-pin') || req.query.pin || '').trim();

  if (given !== PIN) {
    rec.n += 1;
    if (rec.n >= MAX_TRIES) {
      rec.until = Date.now() + LOCK_MS;
      rec.n = 0;
      tries.set(ip, rec);
      notify('Command — locked out', `Five wrong PIN attempts from ${ip}. Locked for 15 minutes.`).catch(() => {});
      return res.status(429).json({ error: 'too many wrong attempts', retry_in_seconds: LOCK_MS / 1000 });
    }
    tries.set(ip, rec);
    return res.status(401).json({ error: 'wrong PIN', tries_left: MAX_TRIES - rec.n });
  }

  tries.delete(ip);
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

/* The 3D yard. Internal tool — lives here, not on the storefront. */
app.get('/city', async (_, res) => {
  try {
    res.type('html').send(await readFile(path.join(PUBLIC, 'city.html'), 'utf8'));
  } catch (e) {
    res.status(500).type('html').send(
      '<body style="background:#0A0908;color:#F2EBDD;font-family:system-ui;padding:40px;line-height:1.7">' +
      '<h2 style="color:#D8B678">city.html was not found</h2>' +
      '<p>The service looked in <code style="color:#D8B678">' + PUBLIC + '</code> and found nothing.</p>' +
      '<p>This almost always means the <code style="color:#D8B678">public/</code> folder did not make it into the ' +
      'GitHub upload. Browser uploads sometimes flatten or skip folders.</p>' +
      '<p><b>Fix:</b> in GitHub, click <b>Add file</b> then <b>Create new file</b>, type ' +
      '<code style="color:#D8B678">public/city.html</code> as the filename (the slash makes the folder), ' +
      'paste the contents of city.html, and commit.</p>' +
      '<p><a style="color:#D8B678" href="/">Back to status</a></p></body>'
    );
  }
});

/* three.js, served from this app so the yard has no external dependency */
app.get('/vendor/three.min.js', async (_, res) => {
  try {
    res.type('application/javascript')
       .set('Cache-Control', 'public, max-age=31536000, immutable')
       .send(await readFile(path.join(PUBLIC, 'vendor', 'three.min.js'), 'utf8'));
  } catch { res.status(404).send('// three.min.js not uploaded to public/vendor/'); }
});

/* favicon for all three pages */
app.get('/favicon.svg', async (_, res) => {
  try { res.type('image/svg+xml').send(await readFile(path.join(PUBLIC, 'favicon.svg'), 'utf8')); }
  catch { res.status(404).end(); }
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

/* Where the work lands: leads, content, outreach. */
app.get('/work', (_, res) => res.type('html').send(workPage()));

app.get('/leads', admin, async (req, res) => res.json(await listEvents(req.query.status || 'all')));
app.post('/leads/:id/status', admin, async (req, res) => {
  const r = await setEventStatus(req.params.id, String(req.body?.status || 'new'));
  res.json({ ok: !!r, row: r });
});
app.get('/runs/:id', admin, async (req, res) => {
  const r = await getRun(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
});

app.get('/health', (_, res) => res.json({
  ok: true,
  agents: AGENTS.length,
  tz: TZ,
  auth: PIN ? 'PIN configured' : 'NO PIN SET — add ADMIN_PIN in Railway',
  pin_length: PIN ? PIN.length : 0,
  supabase: process.env.SUPABASE_URL ? 'configured' : 'not set',
  email: process.env.RESEND_API_KEY ? 'configured' : 'not set'
}));

app.get('/agents', (_, res) => res.json(
  AGENTS.map(a => ({
    id: a.id, name: a.name, person: a.person, role: a.role,
    color: a.color, schedule: a.schedule, search: !!a.search
  }))
));

app.get('/runs', admin, async (_, res) => res.json(await recentRuns(40)));

/* Manual trigger: POST /run/scout  (header x-admin-pin) */
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
  try: ['/', '/admin', '/work', '/city', '/health', '/agents']
}));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Iron Gambit Command listening on ${port}`));
