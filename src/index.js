import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { AGENTS, byId } from './agents.config.js';
import { runAgent } from './runner.js';
import { listOutbox, setOutboxStatus, recentRuns } from './store.js';
import { sendOutreach, notify } from './notify.js';

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

app.get('/health', (_, res) => res.json({ ok: true, agents: AGENTS.length, tz: TZ }));

app.get('/agents', (_, res) => res.json(
  AGENTS.map(a => ({ id: a.id, name: a.name, schedule: a.schedule, search: !!a.search }))
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Iron Gambit Command listening on ${port}`));
