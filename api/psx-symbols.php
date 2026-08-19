<?php
/**
 * Full instrument list (symbol, name, sector) for the search feature.
 * GET https://dps.psx.com.pk/symbols — cached 24h, the list barely changes.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=3600');
header('Access-Control-Allow-Origin: *');

define('PSX_INTERNAL', true);
require __DIR__ . '/_lib.php';

const SYMBOLS_TTL = 86400;
const CACHE_KEY = 'symbols';

try {
    $cached = psx_cache_get(CACHE_KEY, SYMBOLS_TTL);
    if ($cached !== null) {
        echo json_encode($cached);
        exit;
    }

    $json = psx_fetch('/symbols');
    $data = json_decode($json, true);
    if (!is_array($data)) {
        throw new RuntimeException('Unexpected /symbols response shape');
    }

    // Regular equities only — debt instruments aren't quoted on the trading
    // board this site charts, so they'd be dead ends in search results.
    $symbols = array_values(array_filter($data, fn ($s) => empty($s['isDebt'])));
    $symbols = array_map(fn ($s) => [
        'symbol' => $s['symbol'] ?? '',
        'name' => $s['name'] ?? '',
        'sector' => $s['sectorName'] ?? '',
    ], $symbols);

    $payload = ['updatedAt' => gmdate('c'), 'symbols' => $symbols];
    psx_cache_set(CACHE_KEY, $payload);
    echo json_encode($payload);
} catch (Throwable $e) {
    $stale = psx_cache_get(CACHE_KEY, 86400 * 7);
    if ($stale !== null) {
        echo json_encode($stale);
        exit;
    }
    http_response_code(502);
    echo json_encode(['error' => 'PSX data temporarily unavailable']);
}
