<?php
/**
 * Decap CMS OAuth, step 1: send the login popup to GitHub's authorize screen.
 *
 * Client ID/secret are deliberately NOT in this repo (it's on GitHub — anything
 * here is public). They're read from a file one level above the deployed site
 * root, created once by hand on the server. See decap-oauth-secret.php.example
 * at the repo root for the format and CLAUDE.md for the full setup steps.
 */
declare(strict_types=1);
session_start();

$secretsPath = dirname(__DIR__, 3) . '/decap-oauth-secret.php';
if (!is_file($secretsPath)) {
    http_response_code(500);
    header('Content-Type: text/plain');
    echo "Decap CMS isn't configured on this server yet.\n";
    echo "Expected a secrets file at: $secretsPath\n";
    echo "See decap-oauth-secret.php.example in the repo for the format.";
    exit;
}

/** @var array{client_id:string,client_secret:string} $secrets */
$secrets = require $secretsPath;

$provider = $_GET['provider'] ?? '';
if ($provider !== 'github') {
    http_response_code(400);
    echo 'Unsupported provider.';
    exit;
}

$state = bin2hex(random_bytes(16));
$_SESSION['decap_oauth_state'] = $state;

$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https://' : 'http://';
$redirectUri = $scheme . $_SERVER['HTTP_HOST'] . '/api/decap-callback.php';

$authorizeUrl = 'https://github.com/login/oauth/authorize?' . http_build_query([
    'client_id' => $secrets['client_id'],
    'redirect_uri' => $redirectUri,
    'scope' => 'repo,user',
    'state' => $state,
]);

header('Location: ' . $authorizeUrl);
exit;
