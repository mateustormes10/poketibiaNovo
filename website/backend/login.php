<?php
header('Content-Type: application/json');
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';
// Busca diretamente na tabela accounts
$accountQuery = $pdo->query("SELECT id, name, password FROM accounts WHERE name = '" . addslashes($username) . "'");
$account = $accountQuery->fetch();
if ($account && ($account['password'] === $password || password_verify($password, $account['password']))) {
    echo json_encode(['success' => true, 'account_id' => $account['id'], 'username' => $account['name'], 'email' => $account['email'] ?? '']);
    exit;
}
echo json_encode(['success' => false, 'message' => 'Usuário ou senha inválidos.']);
