import { createClient } from '@supabase/supabase-js';

/* Tidy up whatever got pasted into Railway. People paste the REST endpoint,
   or drop the scheme, or leave a trailing slash or space. None of that should
   be able to crash the whole service. */
function normaliseUrl(raw) {
  let u = String(raw || '').trim().replace(/^["']|["']$/g, '');
  if (!u) return '';
  u = u.replace(/^\s*SUPABASE_URL\s*=\s*/i, '');   // whole KEY=VALUE line pasted into the value box
  u = u.trim().replace(/^["']|["']$/g, '');
  u = u.replace(/\/rest\/v1\/?$/i, '');   // the REST endpoint, not the project URL
  u = u.replace(/\/+$/, '');               // trailing slashes
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;   // missing scheme
  return u;
}

const url = normaliseUrl(process.env.SUPABASE_URL);
const key = String(process.env.SUPABASE_SERVICE_KEY || '')
  .trim()
  .replace(/^\s*SUPABASE_SERVICE_KEY\s*=\s*/i, '')   // same paste mistake
  .trim()
  .replace(/^["']|["']$/g, '');

export let dbError = null;
export let db = null;

if (url && key) {
  try {
    db = createClient(url, key, { auth: { persistSession: false } });
    if (url !== String(process.env.SUPABASE_URL || '').trim()) {
      console.log('[store] SUPABASE_URL was tidied to: ' + url);
    }
    console.log('[store] Supabase client ready for ' + url);
  } catch (e) {
    dbError = e.message;
    console.error('[store] Supabase client could not be created: ' + e.message);
  }
} else {
  dbError = !url && !key ? 'SUPABASE_URL and SUPABASE_SERVICE_KEY are both missing'
          : !url ? 'SUPABASE_URL is missing'
          : 'SUPABASE_SERVICE_KEY is missing';
}

export const dbUrl = url;

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

/** Leads found by the Scout, newest and best-fitting first. */
export async function listEvents(status) {
  if (!db) return [];
  let q = db.from('events').select('*').order('fit_score', { ascending: false }).limit(120);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) { console.error('[store] listEvents', error.message); return []; }
  return data || [];
}

export async function setEventStatus(id, status) {
  if (!db) return null;
  const { data, error } = await db.from('events').update({ status }).eq('id', id).select().single();
  if (error) { console.error('[store] setEventStatus', error.message); return null; }
  return data;
}

/** Full text of one run, for reading and copying. */
export async function getRun(id) {
  if (!db) return null;
  const { data } = await db.from('agent_runs').select('*').eq('id', id).single();
  return data || null;
}
