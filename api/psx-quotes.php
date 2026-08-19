<?php
/**
 * Live quotes for every symbol on the regular market board.
 * GET https://dps.psx.com.pk/trading-board/REG/main — cached 5 min server-side,
 * so PSX is polled at most once every 5 minutes regardless of site traffic.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');
header('Access-Control-Allow-Origin: *');

define('PSX_INTERNAL', true);
require __DIR__ . '/_lib.php';

const QUOTES_TTL = 300;
const CACHE_KEY = 'quotes';

try {
    $cached = psx_cache_get(CACHE_KEY, QUOTES_TTL);
    if ($cached !== null) {
        echo json_encode($cached);
        exit;
    }

    $html = psx_fetch('/trading-board/REG/main');
    $rows = psx_parse_table($html);

    $quotes = [];
    foreach ($rows as $row) {
        $symbol = $row['SYMBOL'] ?? '';
        if ($symbol === '') {
            continue;
        }
        $ldcp = psx_to_float($row['LDCP'] ?? '0');
        $change = (float) preg_replace('/[^\d.\-]/', '', $row['CHANGE'] ?? '0');
        $current = round($ldcp + $change, 2);

        $quotes[] = [
            'symbol' => $symbol,
            'name' => $row['NAME'] ?? '',
            'ldcp' => $ldcp,
            'current' => $current,
            'change' => round($change, 2),
            'changePct' => $ldcp != 0.0 ? round(($change / $ldcp) * 100, 2) : 0,
            'volume' => psx_to_int($row['VOLUME'] ?? '0'),
        ];
    }

    $payload = ['updatedAt' => gmdate('c'), 'quotes' => $quotes];
    psx_cache_set(CACHE_KEY, $payload);
    echo json_encode($payload);
} catch (Throwable $e) {
    $stale = psx_cache_get(CACHE_KEY, 86400 * 3);
    if ($stale !== null) {
        echo json_encode($stale);
        exit;
    }
    http_response_code(502);
    echo json_encode(['error' => 'PSX data temporarily unavailable']);
}
