/**
 * Westhead Gates Ltd — sending the enquiry email.
 *
 * A Worker has no mail server of its own, so the enquiry has to be handed to
 * something that does. Pick one with MAIL_PROVIDER in wrangler.toml:
 *
 *   cloudflare   Cloudflare's own Email Workers. No third-party account, no
 *                API key, no cost. Sends only to addresses already verified
 *                as Email Routing destinations on the domain — which is
 *                exactly what a contact form needs. The default.
 *
 *   resend       } an outside provider, if you would rather not use Email
 *   sendgrid     } Routing. Each needs the domain verified with them and an
 *   mailgun      } API key:  npx wrangler secret put MAIL_API_KEY
 *
 *   log          prints the enquiry to the console instead of sending it,
 *                for local testing.
 *
 * Whichever you choose, the sending domain has to be verified with it. That
 * is the step that stops enquiries landing in the junk folder.
 */

import { EmailMessage } from 'cloudflare:email';

const PROVIDERS = {
  /**
   * Cloudflare Email Workers. The SEND_EMAIL binding in wrangler.toml names
   * the addresses it is allowed to send to, and each of those has to be a
   * verified destination in the domain's Email Routing settings. That limit
   * is the whole security model: the Worker can email the business, and
   * nobody else — so it cannot be turned into an open relay by a spammer
   * filling in the form.
   */
  async cloudflare(env, message) {
    if (!env.SEND_EMAIL) {
      throw new Error(
        'No SEND_EMAIL binding. Add the [[send_email]] block to wrangler.toml, ' +
        'and verify the recipient under Email Routing on the domain.'
      );
    }
    // One message per recipient: EmailMessage carries a single destination.
    for (const to of message.to) {
      await env.SEND_EMAIL.send(
        new EmailMessage(message.from, to, mime(message, to))
      );
    }
    return true;
  },

  /** resend.com — the least setup of the outside providers. */
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

/** The providers that talk to an outside HTTP API, and so need a key.
 *  "cloudflare" is authorised by its binding and "log" sends nothing. */
const NEEDS_KEY = ['resend', 'sendgrid', 'mailgun'];

export async function sendMail(env, message) {
  const name = (env.MAIL_PROVIDER || 'cloudflare').toLowerCase();
  const provider = PROVIDERS[name];

  if (!provider) {
    throw new Error(
      `Unknown MAIL_PROVIDER "${name}". Use one of: ${Object.keys(PROVIDERS).join(', ')}.`
    );
  }
  if (NEEDS_KEY.includes(name) && !env.MAIL_API_KEY) {
    throw new Error(`MAIL_PROVIDER is "${name}", which needs a key. ` +
      'Run: npx wrangler secret put MAIL_API_KEY');
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

/* ------------------------------------------------------------------ MIME -- */

/**
 * Build the RFC 5322 message Email Workers expects. The outside providers
 * take a subject and a body and assemble this themselves; Cloudflare hands
 * the message straight to the mail system, so it has to be valid on arrival.
 *
 * Both the subject and the body carry en dashes and curly quotes, so neither
 * can go out as bare 7-bit ASCII: the subject is an RFC 2047 encoded-word and
 * the body is base64 with an explicit UTF-8 charset.
 */
function mime(message, to) {
  const headers = [
    `From: ${encodeName(message.fromName)} <${message.from}>`,
    `To: <${to}>`,
    `Reply-To: ${encodeName(message.replyToName)} <${message.replyToEmail}>`,
    `Subject: ${encodeWord(message.subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${message.from.split('@')[1]}>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ];
  return `${headers.join('\r\n')}\r\n\r\n${wrap(base64(message.text))}`;
}

/** A display name only needs encoding if it is not plain ASCII. */
function encodeName(name) {
  return /^[\x20-\x7e]*$/.test(name) ? `"${name.replace(/"/g, '')}"` : encodeWord(name);
}

/**
 * RFC 2047 encoded-words, split so no single word exceeds the 75-character
 * limit. Chunking is done on the UTF-8 bytes, not the string, so a multi-byte
 * character is never cut in half.
 */
function encodeWord(text) {
  if (/^[\x20-\x7e]*$/.test(text)) return text;
  const bytes = new TextEncoder().encode(text);
  const words = [];
  // 39 bytes -> exactly 52 base64 characters, so a word is 64 with the
  // "=?UTF-8?B?" prefix and "?=" suffix. That keeps the whole line inside the
  // 78 characters RFC 5322 asks for even once "Subject: " is in front of it.
  for (let i = 0; i < bytes.length; i += 39) {
    words.push(`=?UTF-8?B?${base64(bytes.subarray(i, i + 39))}?=`);
  }
  return words.join('\r\n ');
}

function base64(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Base64 bodies are folded at 76 characters. */
function wrap(text) {
  return (text.match(/.{1,76}/g) || []).join('\r\n');
}
