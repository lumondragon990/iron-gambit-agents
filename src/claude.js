import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

/**
 * One call to Claude. Set search:true to give it the web.
 * Returns { text, sources, usage }.
 */
export async function ask({ system, prompt, search = false, maxTokens = 4000 }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }]
  };

  if (search) {
    // Server-side web search. Claude runs the searches itself and cites what it used.
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 10 }];
  }

  const res = await client.messages.create(body);

  const text = res.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  // Collect any URLs Claude actually looked at, so you can verify its claims.
  const sources = [];
  for (const block of res.content) {
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const r of block.content) if (r.url) sources.push({ url: r.url, title: r.title || '' });
    }
  }

  return { text, sources, usage: res.usage };
}

/** Ask for JSON and get a parsed object back, or null if it came back malformed. */
export async function askJSON(opts) {
  const { text, sources, usage } = await ask({
    ...opts,
    system: (opts.system || '') +
      '\n\nRespond with valid JSON only. No markdown fences, no preamble, no commentary.'
  });
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return { data: JSON.parse(cleaned), text, sources, usage };
  } catch {
    return { data: null, text, sources, usage };
  }
}
