import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
export const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

function warn(op) {
  console.warn(`[store] Supabase not configured, skipping ${op}. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.`);
}

export async function saveRun({ agent, output, trigger, sources = [], usage = null }) {
  if (!db) return warn('saveRun');
  const { error } = await db.from('agent_runs').insert({
    agent, output, trigger, sources, tokens_in: usage?.input_tokens ?? null, tokens_out: usage?.output_tokens ?? null
  });
  if (error) console.error('[store] saveRun', error.message);
}

export async function saveEvents(rows) {
  if (!db || !rows?.length) return;
  const { error } = await db.from('events').upsert(rows, { onConflict: 'name,event_date' });
  if (error) console.error('[store] saveEvents', error.message);
}

export async function queueOutbox(rows) {
  if (!db || !rows?.length) return [];
  const { data, error } = await db.from('outbox').insert(rows).select();
  if (error) { console.error('[store] queueOutbox', error.message); return []; }
  return data;
}

export async function listOutbox(status = 'pending') {
  if (!db) return [];
  const { data } = await db.from('outbox').select('*').eq('status', status).order('created_at', { ascending: false });
  return data || [];
}

export async function setOutboxStatus(id, status, extra = {}) {
  if (!db) return null;
  const { data, error } = await db.from('outbox').update({ status, ...extra }).eq('id', id).select().single();
  if (error) { console.error('[store] setOutboxStatus', error.message); return null; }
  return data;
}

export async function recentRuns(limit = 40) {
  if (!db) return [];
  const { data } = await db.from('agent_runs').select('*').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}

/** Everything the city view needs, in one query round. */
export async function worldState() {
  if (!db) return { live: false, runs: [], counts: { outbox: 0, events: 0 } };
  const [{ data: runs }, { count: outbox }, { count: events }] = await Promise.all([
    db.from('agent_runs').select('id,agent,output,trigger,created_at').order('created_at', { ascending: false }).limit(60),
    db.from('outbox').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('events').select('id', { count: 'exact', head: true })
  ]);
  return { live: true, runs: runs || [], counts: { outbox: outbox || 0, events: events || 0 } };
}
