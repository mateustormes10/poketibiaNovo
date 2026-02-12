<?php
header('Content-Type: application/json');
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

// Se já existe cookie, evita múltiplos logins no mesmo navegador
if (isset($_COOKIE['account_id']) && is_numeric($_COOKIE['account_id'])) {
    echo json_encode(['success' => false, 'message' => 'Você já está logado neste navegador.']);
    exit;
}
// Busca diretamente na tabela accounts
$stmt = $pdo->prepare('SELECT id, name, password, email FROM accounts WHERE name = ? LIMIT 1');
$stmt->execute([$username]);
$account = $stmt->fetch();
if ($account && ($account['password'] === $password || password_verify($password, $account['password']))) {
    // Cookie simples para manter login (JS usa para alternar sidebar)
    $cookieOptions = [
        'expires' => time() + (60 * 60 * 24 * 7),
        'path' => '/',
        'samesite' => 'Lax'
    ];
    setcookie('account_id', (string)$account['id'], $cookieOptions);
    setcookie('username', (string)$account['name'], $cookieOptions);

    echo json_encode(['success' => true, 'account_id' => $account['id'], 'username' => $account['name'], 'email' => $account['email'] ?? '']);
    exit;
}
echo json_encode(['success' => false, 'message' => 'Usuário ou senha inválidos.']);
