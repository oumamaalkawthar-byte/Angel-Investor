<?php
/**
 * OHLCV history for one symbol, for the click-to-chart panel.
 * POST https://dps.psx.com.pk/historical — cached 15 min per symbol, matching
 * psxdata's own live-data cache policy.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('Access-Control-Allow-Origin: *');

define('PSX_INTERNAL', true);
require __DIR__ . '/_lib.php';

const HISTORY_TTL = 900;

$symbol = strtoupper(preg_replace('/[^A-Z0-9.]/i', '', $_GET['symbol'] ?? ''));
if ($symbol === '') {
    http_response_code(400);
    echo json_encode(['error' => 'symbol query parameter is required']);
    exit;
}

$cacheKey = 'history-' . $symbol;

try {
    $cached = psx_cache_get($cacheKey, HISTORY_TTL);
    if ($cached !== null) {
        echo json_encode($cached);
        exit;
    }

    $html = psx_fetch('/historical', ['symbol' => $symbol]);
    $rows = psx_parse_table($html);

    $bars = [];
    foreach ($rows as $row) {
        $bars[] = [
            'date' => $row['DATE'] ?? '',
            'open' => psx_to_float($row['OPEN'] ?? '0'),
            'high' => psx_to_float($row['HIGH'] ?? '0'),
            'low' => psx_to_float($row['LOW'] ?? '0'),
            'close' => psx_to_float($row['CLOSE'] ?? '0'),
            'volume' => psx_to_int($row['VOLUME'] ?? '0'),
        ];
    }
    // PSX returns newest-first; charts read chronologically.
    $bars = array_reverse($bars);

    $payload = ['symbol' => $symbol, 'updatedAt' => gmdate('c'), 'bars' => $bars];
    psx_cache_set($cacheKey, $payload);
    echo json_encode($payload);
} catch (Throwable $e) {
    $stale = psx_cache_get($cacheKey, 86400 * 7);
    if ($stale !== null) {
        echo json_encode($stale);
        exit;
    }
    http_response_code(502);
    echo json_encode(['error' => 'PSX data temporarily unavailable', 'symbol' => $symbol]);
}
