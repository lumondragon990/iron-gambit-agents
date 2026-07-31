import 'dotenv/config';
import { byId, AGENTS } from './agents.config.js';
import { runAgent } from './runner.js';

const id = process.argv[2];
const data = process.argv.slice(3).join(' ');

if (!id) {
  console.log('Usage: npm run <agent-id> [data]\n\nAgents:');
  AGENTS.forEach(a => console.log(`  ${a.id.padEnd(10)} ${a.name.padEnd(18)} ${a.schedule || 'on demand'}`));
  process.exit(0);
}
const agent = byId(id);
if (!agent) { console.error(`No agent "${id}"`); process.exit(1); }

const out = await runAgent(agent, { trigger: 'manual', data });
console.log('\n' + out.summary);
process.exit(0);
