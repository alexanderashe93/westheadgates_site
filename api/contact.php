<?php
/**
 * Westhead Gates — contact form handler.
 *
 * Accepts a POST from contact.html, validates it, and emails the enquiry.
 * Works both with JavaScript (returns JSON) and without it (redirects back
 * to the contact page with ?sent=1 or ?error=...).
 *
 * Edit api/config.php to set the recipient address.
 */

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

/* ------------------------------------------------------------------ helpers */

function wants_json(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xhr    = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return str_contains($accept, 'application/json') || $xhr === 'XMLHttpRequest';
}

function respond(bool $ok, string $message, int $status = 200): void
{
    if (wants_json()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        echo json_encode(array('ok' => $ok, 'message' => $message));
    } else {
        $query = $ok ? 'sent=1' : 'error=' . rawurlencode($message);
        header('Location: ../contact.html?' . $query . '#form', true, 303);
    }
    exit;
}

/** Strip anything that could be used to inject extra mail headers. */
function header_safe(string $value): string
{
    return trim(str_replace(array("\r", "\n", "%0a", "%0d", "\0"), ' ', $value));
}

function field(string $name, int $maxLength = 500): string
{
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) {
        return '';
    }
    $value = trim($value);
    // Normalise line endings and drop control characters except tab/newline.
    $value = str_replace(array("\r\n", "\r"), "\n", $value);
    $value = preg_replace('/[^\P{C}\n\t]+/u', '', $value) ?? '';
    return mb_substr($value, 0, $maxLength);
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/* -------------------------------------------------------------- guard rails */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(false, 'This address only accepts form submissions.', 405);
}

// 1. Honeypot: a field hidden from people. Anything in it is a bot.
if (field('website') !== '') {
    // Behave exactly like success, so the bot doesn't learn anything.
    respond(true, 'Thanks — your enquiry is with us.');
}

// 2. Time trap: real people don't complete a form in under a few seconds.
$loadedAt = (int) ($_POST['loaded_at'] ?? 0);
$minSeconds = (int) $config['min_seconds_on_page'];
if ($loadedAt > 0 && (time() - $loadedAt) < $minSeconds) {
    respond(true, 'Thanks — your enquiry is with us.');
}

// 3. Rate limit per IP, using a small file of timestamps.
$limit = (int) $config['rate_limit_per_hour'];
if ($limit > 0) {
    $cacheDir = __DIR__ . DIRECTORY_SEPARATOR . 'cache';
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0775, true);
    }
    $rateFile = $cacheDir . DIRECTORY_SEPARATOR . 'rate-' . md5(client_ip()) . '.json';
    $hits = array();
    if (is_readable($rateFile)) {
        $decoded = json_decode((string) @file_get_contents($rateFile), true);
        if (is_array($decoded)) {
            $hits = $decoded;
        }
    }
    $cutoff = time() - 3600;
    $hits = array_values(array_filter($hits, static fn($t): bool => (int) $t > $cutoff));

    if (count($hits) >= $limit) {
        respond(false, 'That is a lot of enquiries from one place. Please call us instead.', 429);
    }
    $hits[] = time();
    @file_put_contents($rateFile, json_encode($hits), LOCK_EX);
}

/* -------------------------------------------------------------- validation */

$name     = field('name', 120);
$phone    = field('phone', 40);
$email    = field('email', 180);
$postcode = field('postcode', 12);
$subject  = field('subject', 60);
$message  = field('message', 4000);
$consent  = ($_POST['consent'] ?? '') !== '';

$errors = array();

if (mb_strlen($name) < 2) {
    $errors[] = 'a name';
}
if (!preg_match('/^[\d\s+()-]{7,}$/', $phone)) {
    $errors[] = 'a phone number';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'a valid email address';
}
if (mb_strlen($message) < 10) {
    $errors[] = 'a description of the job';
}
if (!$consent) {
    $errors[] = 'your permission to reply';
}

if ($errors) {
    respond(false, 'Please add ' . implode(', ', $errors) . '.', 422);
}

$subjects = array(
    'new-gates'         => 'Driveway gates — new',
    'automation'        => 'Automation for existing gates',
    'railings'          => 'Railings, fencing or balustrade',
    'repair'            => 'Repair or service',
    'safety-inspection' => 'Safety inspection of an existing gate',
    'other'             => 'Something else',
);
$subjectLabel = $subjects[$subject] ?? 'Website enquiry';

/* ------------------------------------------------------------------- email */

$lines = array(
    'New enquiry from the Westhead Gates website',
    str_repeat('=', 44),
    '',
    'Name:      ' . $name,
    'Phone:     ' . $phone,
    'Email:     ' . $email,
    'Postcode:  ' . ($postcode !== '' ? $postcode : '—'),
    'Enquiry:   ' . $subjectLabel,
    '',
    'Message',
    str_repeat('-', 44),
    $message,
    '',
    str_repeat('-', 44),
    'Sent:      ' . date('D j M Y, H:i'),
    'IP:        ' . client_ip(),
);
$body = implode("\n", $lines);

$fromAddress = header_safe((string) $config['mail_from']);
$fromName    = header_safe((string) $config['mail_from_name']);
$replyTo     = header_safe($email);
$replyName   = header_safe($name);

$headers = array(
    'From: ' . $fromName . ' <' . $fromAddress . '>',
    'Reply-To: ' . $replyName . ' <' . $replyTo . '>',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: westheadgates-site',
);

$mailSubject = header_safe($config['subject_prefix'] . ' ' . $subjectLabel . ' — ' . $name);

$recipients = array_filter(array_map('header_safe', (array) $config['enquiry_recipients']));
if (!$recipients) {
    error_log('westheadgates: no enquiry_recipients configured in api/config.php');
    respond(false, 'The contact form is not configured yet. Please call us instead.', 500);
}

$sent = @mail(
    implode(', ', $recipients),
    $mailSubject,
    $body,
    implode("\r\n", $headers),
    '-f' . $fromAddress
);

if (!$sent) {
    error_log('westheadgates: mail() failed for enquiry from ' . $email);
    respond(false, 'Sorry, the message could not be sent. Please call us instead.', 500);
}

respond(true, 'Thanks — your enquiry is with us. We’ll be in touch shortly.');
