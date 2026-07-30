import fs from 'node:fs/promises';
import path from 'node:path';
import { ask, askJSON } from './claude.js';
import { saveRun, saveEvents, queueOutbox } from './store.js';
import { notify } from './notify.js';

let brandCache = null;
async function brand() {
  if (brandCache) return brandCache;
  try {
    brandCache = await fs.readFile(path.resolve('brand/BRAND.md'), 'utf8');
  } catch {
    brandCache = '(brand/BRAND.md missing — voice rules will be weaker than they should be)';
  }
  return brandCache;
}

export async function runAgent(agent, { trigger = 'cron', data = '' } = {}) {
  const started = Date.now();
  const system = `${agent.system}\n\n=== BRAND CORE (authoritative) ===\n${await brand()}`;
  const prompt = agent.prompt.replace('{{DATA}}', data || '(no data supplied)');

  const wantsJSON = agent.format === 'events' || agent.format === 'outreach';
  const call = wantsJSON ? askJSON : ask;
  const res = await call({ system, prompt, search: agent.search, maxTokens: 5000 });

  await saveRun({
    agent: agent.id, output: res.text, trigger,
    sources: res.sources, usage: res.usage
  });

  let summary = res.text;

  if (agent.format === 'events' && res.data?.events) {
    const rows = res.data.events.map(e => ({
      name: e.name, venue: e.venue || null,
      event_date: e.event_date || null, cost: e.cost || null,
      apply_url: e.apply_url || null, fit_score: e.fit_score ?? null,
      notes: e.why || null, deadline: e.deadline || null
    }));
    await saveEvents(rows);
    const urgent = rows.filter(r => r.deadline && daysUntil(r.deadline) <= 14);
    summary =
      rows.slice(0, 6).map(r => `${r.fit_score}/10  ${r.name} — ${r.cost || 'cost unknown'}\n${r.why || ''}`).join('\n\n') +
      (urgent.length ? `\n\nDEADLINE INSIDE 14 DAYS:\n${urgent.map(u => `• ${u.name} — ${u.deadline}`).join('\n')}` : '');
  }

  if (agent.format === 'outreach' && res.data?.outreach) {
    const rows = res.data.outreach.map(o => ({
      agent: agent.id, to_name: o.to_name, handle: o.handle || null,
      platform: o.platform || null, to_email: o.to_email || null,
      subject: o.subject || null, body: o.body, notes: o.why || null,
      status: 'pending'
    }));
    const saved = await queueOutbox(rows);
    const mailable = rows.filter(r => r.to_email).length;
    summary = `${rows.length} drafts queued (${mailable} have an email address, ${rows.length - mailable} are DM-only).\n\n` +
      rows.map(r => `— ${r.to_name} (${r.handle || 'no handle'})\n${r.body}`).join('\n\n') +
      `\n\nNothing sends until you approve it: GET /outbox`;
  }

  await notify(`${agent.name} — ${new Date().toLocaleString('en-US', { timeZone: process.env.TIMEZONE || 'America/Chicago' })}`, summary);

  console.log(`[runner] ${agent.id} done in ${Math.round((Date.now() - started) / 1000)}s`);
  return { text: res.text, data: res.data ?? null, summary };
}

function daysUntil(d) {
  return Math.round((new Date(d) - Date.now()) / 86400000);
}
