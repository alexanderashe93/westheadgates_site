/**
 * Westhead Gates Ltd — sending the enquiry email.
 *
 * A Worker has no mail server of its own, so the message goes out over HTTPS
 * through whichever provider is configured.
 *
 * Pick one with the MAIL_PROVIDER variable in wrangler.toml and set its key:
 *
 *   npx wrangler secret put MAIL_API_KEY
 *
 * Whichever you choose, the sending domain has to be verified with that
 * provider — that is what stops enquiries landing in the junk folder.
 */

const PROVIDERS = {
  /** resend.com — the least setup: verify the domain, create a key, done. */
  async resend(env, message) {
    return post('https://api.resend.com/emails', {
      headers: { Authorization: `Bearer ${env.MAIL_API_KEY}` },
      body: {
        from: `${message.fromName} <${message.from}>`,
        to: message.to,
        reply_to: message.replyTo,
        subject: message.subject,
        text: message.text,
      },
    });
  },

  async sendgrid(env, message) {
    return post('https://api.sendgrid.com/v3/mail/send', {
      headers: { Authorization: `Bearer ${env.MAIL_API_KEY}` },
      body: {
        personalizations: [{ to: message.to.map((email) => ({ email })) }],
        from: { email: message.from, name: message.fromName },
        reply_to: { email: message.replyToEmail, name: message.replyToName },
        subject: message.subject,
        content: [{ type: 'text/plain', value: message.text }],
      },
    });
  },

  async mailgun(env, message) {
    const domain = env.MAILGUN_DOMAIN;
    if (!domain) throw new Error('MAILGUN_DOMAIN is not set');
    const form = new URLSearchParams({
      from: `${message.fromName} <${message.from}>`,
      to: message.to.join(','),
      'h:Reply-To': message.replyTo,
      subject: message.subject,
      text: message.text,
    });
    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`api:${env.MAIL_API_KEY}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    return check(response);
  },

  /** Local development: print the message to the console instead of sending. */
  async log(env, message) {
    console.log('--- enquiry (MAIL_PROVIDER=log, nothing sent) ---');
    console.log(`To:      ${message.to.join(', ')}`);
    console.log(`Subject: ${message.subject}`);
    console.log(message.text);
    return true;
  },
};

export async function sendMail(env, message) {
  const name = (env.MAIL_PROVIDER || 'resend').toLowerCase();
  const provider = PROVIDERS[name];

  if (!provider) {
    throw new Error(
      `Unknown MAIL_PROVIDER "${name}". Use one of: ${Object.keys(PROVIDERS).join(', ')}.`
    );
  }
  if (name !== 'log' && !env.MAIL_API_KEY) {
    throw new Error('MAIL_API_KEY is not set. Run: npx wrangler secret put MAIL_API_KEY');
  }
  return provider(env, message);
}

async function post(url, { headers, body }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return check(response);
}

async function check(response) {
  if (response.ok) return true;
  // The provider's own words are far more use in the log than a status code.
  const detail = (await response.text().catch(() => '')).slice(0, 500);
  throw new Error(`mail provider returned ${response.status}: ${detail}`);
}
