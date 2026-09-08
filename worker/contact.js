/**
 * Westhead Gates — contact form handler for Cloudflare.
 *
 * The port of api/contact.php, down to the wording of the replies, so the
 * form behaves identically whichever host is serving it: JSON back to
 * contact.js when JavaScript is on, a 303 redirect to contact.html when it
 * is off.
 */

import { config, SUBJECTS } from './config.js';
import { sendMail } from './mail.js';

export async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return respond(request, false, 'This address only accepts form submissions.', 405);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return respond(request, false, 'That form could not be read. Please try again.', 400);
  }

  /* ---------------------------------------------------------- guard rails */

  // 1. Honeypot: a field hidden from people. Anything in it is a bot, and it
  //    is told the same thing a person is told so it learns nothing.
  if (field(form, 'website') !== '') {
    return respond(request, true, 'Thanks — your enquiry is with us.');
  }

  // 2. Time trap: real people don't complete a form in under a few seconds.
  const loadedAt = parseInt(form.get('loaded_at') || '0', 10);
  const now = Math.floor(Date.now() / 1000);
  if (loadedAt > 0 && now - loadedAt < config.minSecondsOnPage) {
    return respond(request, true, 'Thanks — your enquiry is with us.');
  }

  // 3. Rate limit per IP. Needs the RATE KV namespace; without it, skipped.
  const overLimit = await rateLimited(request, env);
  if (overLimit) {
    return respond(
      request, false,
      'That is a lot of enquiries from one place. Please call us instead.',
      429
    );
  }

  /* ----------------------------------------------------------- validation */

  const name = field(form, 'name', 120);
  const phone = field(form, 'phone', 40);
  const email = field(form, 'email', 180);
  const postcode = field(form, 'postcode', 12);
  const subject = field(form, 'subject', 60);
  const message = field(form, 'message', 4000);
  const consent = (form.get('consent') || '') !== '';

  const missing = [];
  if (name.length < 2) missing.push('a name');
  if (!/^[\d\s+()-]{7,}$/.test(phone)) missing.push('a phone number');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push('a valid email address');
  if (message.length < 10) missing.push('a description of the job');
  if (!consent) missing.push('your permission to reply');

  if (missing.length) {
    return respond(request, false, `Please add ${missing.join(', ')}.`, 422);
  }

  /* ---------------------------------------------------------------- email */

  const subjectLabel = SUBJECTS[subject] || 'Website enquiry';
  const recipients = config.enquiryRecipients.map(headerSafe).filter(Boolean);

  if (!recipients.length) {
    console.error('westheadgates: no enquiryRecipients set in worker/config.js');
    return respond(request, false, 'The contact form is not configured yet. Please call us instead.', 500);
  }

  const rule = '-'.repeat(44);
  const text = [
    'New enquiry from the Westhead Gates website',
    '='.repeat(44),
    '',
    `Name:      ${name}`,
    `Phone:     ${phone}`,
    `Email:     ${email}`,
    `Postcode:  ${postcode || '—'}`,
    `Enquiry:   ${subjectLabel}`,
    '',
    'Message',
    rule,
    message,
    '',
    rule,
    `Sent:      ${stamp()}`,
    `IP:        ${clientIp(request)}`,
  ].join('\n');

  try {
    await sendMail(env, {
      to: recipients,
      from: headerSafe(config.mailFrom),
      fromName: headerSafe(config.mailFromName),
      replyTo: `${headerSafe(name)} <${headerSafe(email)}>`,
      replyToEmail: headerSafe(email),
      replyToName: headerSafe(name),
      subject: headerSafe(`${config.subjectPrefix} ${subjectLabel} — ${name}`),
      text,
    });
  } catch (error) {
    // The enquiry itself is in the log, so nothing is lost while a
    // misconfigured provider is being sorted out.
    console.error(`westheadgates: sending failed for ${email}: ${error.message}`);
    console.error(text);
    return respond(request, false, 'Sorry, the message could not be sent. Please call us instead.', 500);
  }

  return respond(request, true, 'Thanks — your enquiry is with us. We’ll be in touch shortly.');
}

/* --------------------------------------------------------------- helpers -- */

function field(form, name, maxLength = 500) {
  const raw = form.get(name);
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/\r\n?/g, '\n')
    // Drop control characters, keeping tab and newline. Reads oddly, but a
    // negated class of "not a control character, or \n, or \t" is the one
    // form that works in a plain Unicode regex — same pattern as the PHP.
    .replace(/[^\P{C}\n\t]+/gu, '')
    .trim()
    .slice(0, maxLength);
}

/** Strip anything that could be used to inject extra mail headers. */
function headerSafe(value) {
  return String(value).replace(/[\r\n\0]+/g, ' ').trim();
}

function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || '0.0.0.0';
}

async function rateLimited(request, env) {
  if (!env.RATE || config.rateLimitPerHour <= 0) return false;

  const key = `rate:${clientIp(request)}`;
  try {
    const count = parseInt((await env.RATE.get(key)) || '0', 10);
    if (count >= config.rateLimitPerHour) return true;
    // The window is the key's lifetime: an hour after the first enquiry the
    // record expires and the count starts again.
    await env.RATE.put(key, String(count + 1), { expirationTtl: 3600 });
    return false;
  } catch (error) {
    // A KV outage must not take the contact form down with it.
    console.error(`westheadgates: rate limit check failed: ${error.message}`);
    return false;
  }
}

function stamp() {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/London',
  }).format(new Date());
}

function wantsJson(request) {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('application/json') ||
    request.headers.get('X-Requested-With') === 'XMLHttpRequest';
}

function respond(request, ok, message, status = 200) {
  if (wantsJson(request)) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  const query = ok ? 'sent=1' : `error=${encodeURIComponent(message)}`;
  return new Response(null, {
    status: 303,
    headers: { Location: `/contact.html?${query}#form` },
  });
}
