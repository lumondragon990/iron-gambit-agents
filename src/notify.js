import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Discord is the fastest way to get a phone notification. One webhook URL, no auth flow. */
export async function toDiscord(title, body) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const chunk = body.length > 1800 ? body.slice(0, 1800) + '\n…' : body;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{ title, description: chunk, color: 0xd8b678, timestamp: new Date().toISOString() }]
      })
    });
  } catch (e) { console.error('[notify] discord', e.message); }
}

export async function toEmail(subject, body) {
  if (!resend || !process.env.DIGEST_TO) return;
  try {
    await resend.emails.send({
      from: process.env.MAIL_FROM || 'command@example.com',
      to: process.env.DIGEST_TO,
      subject,
      text: body
    });
  } catch (e) { console.error('[notify] email', e.message); }
}

export async function notify(title, body) {
  await Promise.all([toDiscord(title, body), toEmail(title, body)]);
}

/** Sends a single approved outreach message. */
export async function sendOutreach({ to_email, subject, body }) {
  if (!resend) throw new Error('RESEND_API_KEY not set');
  const r = await resend.emails.send({
    from: process.env.MAIL_FROM,
    to: to_email,
    subject,
    text: body
  });
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
