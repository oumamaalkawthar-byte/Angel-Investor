<?php
/**
 * Decap CMS OAuth, step 2: GitHub redirects here with a ?code=..., we swap it
 * for an access token server-side (client_secret never reaches the browser),
 * then hand the token back to the admin UI via the exact postMessage handshake
 * Decap's GitHub backend expects (see decap-cms-lib-auth's netlify-auth.js:
 * a ping/pong "authorizing:github" followed by "authorization:github:success:...").
 */
declare(strict_types=1);
session_start();

function decap_finish(string $status, array $payload): void
{
    // HEX_* flags escape ', ", <, > and & to \uXXXX so the JSON can be safely
    // dropped inside a single-quoted JS string inside an inline <script>.
    $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_HEX_TAG | JSON_HEX_AMP);
    header('Content-Type: text/html; charset=utf-8');
    ?>
<!doctype html>
<html><body>
<script>
(function () {
  function receiveMessage(e) {
    window.opener.postMessage(
      'authorization:github:<?= $status ?>:<?= $json ?>',
      e.origin
    );
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>
<?php
    exit;
}

$secretsPath = dirname(__DIR__, 3) . '/decap-oauth-secret.php';
$secrets = is_file($secretsPath) ? require $secretsPath : null;
if (!$secrets) {
    decap_finish('error', ['message' => "Decap CMS isn't configured on this server yet (missing $secretsPath)."]);
}

$state = $_GET['state'] ?? '';
$code = $_GET['code'] ?? '';
$expectedState = $_SESSION['decap_oauth_state'] ?? null;
unset($_SESSION['decap_oauth_state']);

if (!$code || !$state || !$expectedState || !hash_equals($expectedState, $state)) {
    decap_finish('error', ['message' => 'Invalid or expired login attempt — please try logging in again.']);
}

$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_POSTFIELDS => http_build_query([
        'client_id' => $secrets['client_id'],
        'client_secret' => $secrets['client_secret'],
        'code' => $code,
    ]),
    CURLOPT_TIMEOUT => 20,
]);
$body = curl_exec($ch);
$httpStatus = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

$data = $body !== false ? json_decode($body, true) : null;

if ($body === false || $httpStatus >= 400 || !is_array($data) || empty($data['access_token'])) {
    decap_finish('error', [
        'message' => $data['error_description'] ?? $curlErr ?? 'GitHub token exchange failed.',
    ]);
}

decap_finish('success', ['token' => $data['access_token'], 'provider' => 'github']);
