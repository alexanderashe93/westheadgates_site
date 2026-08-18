<?php
/**
 * Westhead Gates — gallery image index.
 *
 * Reads the /images/ folder and returns every photo it finds as JSON.
 * Nothing is hard-coded: add a file to the folder and it appears on the
 * gallery page; delete it and it's gone.
 *
 * Sub-folders become filter categories:
 *
 *   images/gate.jpg                        -> no category
 *   images/driveway-gates/estate.jpg       -> category "Driveway gates"
 *
 * Captions come from the filename, with any ordering prefix stripped:
 *
 *   01-estate-gates-in-oak.jpg             -> "Estate gates in oak"
 *
 * To set a caption by hand, create images/captions.json:
 *
 *   { "driveway-gates/estate.jpg": "Estate gates, Ormskirk" }
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Content-Type-Options: nosniff');

$config = require __DIR__ . '/config.php';

$root      = dirname(__DIR__);
$imagesDir = $root . DIRECTORY_SEPARATOR . trim($config['images_dir'], '/\\');
$webBase   = trim($config['images_dir'], '/\\');
$allowed   = array_map('strtolower', $config['image_extensions']);

/**
 * Turn a filename into a readable caption.
 * "01-estate-gates_in-oak.JPG" -> "Estate gates in oak"
 */
function caption_from_filename(string $filename): string
{
    $name = pathinfo($filename, PATHINFO_FILENAME);
    // Drop a leading ordering prefix: "01-", "02_", "003 ".
    $name = preg_replace('/^\d+\s*[-_. ]\s*/', '', $name);
    $name = str_replace(array('-', '_'), ' ', (string) $name);
    $name = preg_replace('/\s+/', ' ', $name);
    $name = trim((string) $name);

    if ($name === '') {
        return '';
    }
    return function_exists('mb_strtoupper')
        ? mb_strtoupper(mb_substr($name, 0, 1)) . mb_substr($name, 1)
        : ucfirst($name);
}

/**
 * "driveway-gates" -> "Driveway gates"
 */
function label_from_dirname(string $dir): string
{
    $label = trim(str_replace(array('-', '_'), ' ', $dir));
    return function_exists('mb_strtoupper')
        ? mb_strtoupper(mb_substr($label, 0, 1)) . mb_substr($label, 1)
        : ucfirst($label);
}

function fail(string $message, int $status = 500): void
{
    http_response_code($status);
    echo json_encode(array(
        'ok'      => false,
        'message' => $message,
        'images'  => array(),
    ), JSON_UNESCAPED_SLASHES);
    exit;
}

if (!is_dir($imagesDir)) {
    fail('The images folder was not found. Create /' . $webBase . '/ in the site root.', 404);
}

/* ---------------------------------------------------------------------------
 * Collect files: the images folder itself, plus one level of sub-folders.
 * ------------------------------------------------------------------------ */

$files = array();

$collect = static function (string $absDir, string $relPrefix, string $category) use (&$files, $allowed): void {
    $entries = @scandir($absDir);
    if ($entries === false) {
        return;
    }
    foreach ($entries as $entry) {
        if ($entry === '.' || $entry === '..' || $entry[0] === '.') {
            continue;
        }
        $abs = $absDir . DIRECTORY_SEPARATOR . $entry;
        if (!is_file($abs)) {
            continue;
        }
        $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed, true)) {
            continue;
        }
        $files[] = array(
            'abs'      => $abs,
            'rel'      => $relPrefix . $entry,
            'category' => $category,
            'mtime'    => (int) @filemtime($abs),
            'size'     => (int) @filesize($abs),
        );
    }
};

$collect($imagesDir, '', '');

foreach ((array) @scandir($imagesDir) as $entry) {
    if ($entry === '.' || $entry === '..' || $entry[0] === '.') {
        continue;
    }
    $sub = $imagesDir . DIRECTORY_SEPARATOR . $entry;
    if (is_dir($sub)) {
        $collect($sub, $entry . '/', label_from_dirname($entry));
    }
}

if (!$files) {
    echo json_encode(array(
        'ok'      => true,
        'count'   => 0,
        'message' => 'No photos found in /' . $webBase . '/ yet.',
        'images'  => array(),
    ), JSON_UNESCAPED_SLASHES);
    exit;
}

/* ---------------------------------------------------------------------------
 * Reading image dimensions is the slow part, so cache the result and only
 * redo it when the folder's contents actually change.
 * ------------------------------------------------------------------------ */

$signatureParts = array();
foreach ($files as $file) {
    $signatureParts[] = $file['rel'] . '|' . $file['mtime'] . '|' . $file['size'];
}
sort($signatureParts);

// Hand-written captions change the output too, so they belong in the signature.
$captionsFile = $imagesDir . DIRECTORY_SEPARATOR . 'captions.json';
$signatureParts[] = 'captions|' . (is_readable($captionsFile)
    ? (string) @filemtime($captionsFile) . '|' . (string) @filesize($captionsFile)
    : 'none');

$signature = md5(implode("\n", $signatureParts) . '|' . $config['gallery_sort']);

$cacheDir  = __DIR__ . DIRECTORY_SEPARATOR . 'cache';
$cacheFile = $cacheDir . DIRECTORY_SEPARATOR . 'gallery.json';

if (is_readable($cacheFile)) {
    $cached = json_decode((string) @file_get_contents($cacheFile), true);
    if (is_array($cached) && ($cached['signature'] ?? null) === $signature) {
        echo json_encode(array(
            'ok'     => true,
            'count'  => count($cached['images']),
            'cached' => true,
            'images' => $cached['images'],
        ), JSON_UNESCAPED_SLASHES);
        exit;
    }
}

/* --------------------------------------------------------------- build list */

// Hand-written captions, if the file exists.
$captions = array();
if (is_readable($captionsFile)) {
    $decoded = json_decode((string) file_get_contents($captionsFile), true);
    if (is_array($decoded)) {
        $captions = $decoded;
    }
}

if ($config['gallery_sort'] === 'name') {
    usort($files, static function (array $a, array $b): int {
        return strnatcasecmp($a['rel'], $b['rel']);
    });
} else {
    usort($files, static function (array $a, array $b): int {
        return $b['mtime'] <=> $a['mtime'];
    });
}

$images = array();
foreach ($files as $file) {
    $width = null;
    $height = null;
    $size = @getimagesize($file['abs']);
    if (is_array($size)) {
        $width  = (int) $size[0];
        $height = (int) $size[1];
    }

    $images[] = array(
        'src'      => $webBase . '/' . str_replace('%2F', '/', rawurlencode($file['rel'])),
        'caption'  => $captions[$file['rel']] ?? caption_from_filename(basename($file['rel'])),
        'category' => $file['category'],
        'width'    => $width,
        'height'   => $height,
    );
}

// Best effort — a read-only filesystem just means no caching.
if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0775, true);
}
@file_put_contents($cacheFile, json_encode(array(
    'signature' => $signature,
    'images'    => $images,
), JSON_UNESCAPED_SLASHES), LOCK_EX);

echo json_encode(array(
    'ok'     => true,
    'count'  => count($images),
    'cached' => false,
    'images' => $images,
), JSON_UNESCAPED_SLASHES);
