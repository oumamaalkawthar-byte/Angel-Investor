<?php
/**
 * Shared PSX fetch + disk-cache helpers for the api/psx-*.php endpoints.
 * Not directly routable — every caller must define PSX_INTERNAL first.
 */
if (!defined('PSX_INTERNAL')) {
    http_response_code(403);
    exit;
}

define('PSX_BASE', 'https://dps.psx.com.pk');
define('PSX_CACHE_DIR', __DIR__ . '/cache');

/**
 * Fetch a path from PSX's data portal. GET by default; POST when $postData is given.
 * Mirrors the headers the dps.psx.com.pk frontend itself sends for these AJAX
 * endpoints (see github.com/mtauha/psxdata/blob/main/psxdata/constants.py).
 */
function psx_fetch(string $path, ?array $postData = null): string
{
    $headers = [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer: https://dps.psx.com.pk/',
        'X-Requested-With: XMLHttpRequest',
    ];

    $ch = curl_init(PSX_BASE . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    if ($postData !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    }

    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    if ($body === false || $status >= 400) {
        throw new RuntimeException("PSX fetch failed for $path: HTTP $status $err");
    }

    return $body;
}

/** Read a cache entry if it exists and is younger than $ttlSeconds. */
function psx_cache_get(string $key, int $ttlSeconds): ?array
{
    $file = PSX_CACHE_DIR . '/' . $key . '.json';
    if (!is_file($file) || (time() - filemtime($file)) > $ttlSeconds) {
        return null;
    }
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

function psx_cache_set(string $key, array $data): void
{
    if (!is_dir(PSX_CACHE_DIR)) {
        mkdir(PSX_CACHE_DIR, 0755, true);
    }
    file_put_contents(PSX_CACHE_DIR . '/' . $key . '.json', json_encode($data), LOCK_EX);
}

/** Parse an HTML <table> (thead th + tbody tr/td) into rows keyed by header text. */
function psx_parse_table(string $html): array
{
    $dom = new DOMDocument();
    libxml_use_internal_errors(true);
    $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html);
    libxml_clear_errors();
    $xpath = new DOMXPath($dom);

    $headers = [];
    foreach ($xpath->query('//table//thead//th') as $th) {
        $headers[] = trim($th->textContent);
    }
    if (!$headers) {
        return [];
    }

    $rows = [];
    foreach ($xpath->query('//table//tbody//tr') as $tr) {
        $cells = $xpath->query('./td', $tr);
        if ($cells->length === 0) {
            continue;
        }
        $row = [];
        foreach ($headers as $i => $h) {
            $cell = $cells->item($i);
            $row[$h] = $cell ? trim($cell->textContent) : '';
        }
        $rows[] = $row;
    }
    return $rows;
}

function psx_to_float(string $raw): float
{
    return (float) str_replace(',', '', $raw);
}

function psx_to_int(string $raw): int
{
    return (int) str_replace(',', '', $raw);
}
