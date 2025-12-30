<?php
header('Content-Type: application/json');
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';
$email = $data['email'] ?? '';
if (!$username || !$password) {
    echo json_encode(['success' => false, 'message' => 'Preencha todos os campos obrigatórios.']);
    exit;
}
// Verifica se já existe account ou player com esse nome
$stmt = $pdo->prepare('SELECT id FROM accounts WHERE name = ?');
$stmt->execute([$username]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Nome de usuário já existe.']);
    exit;
}
$stmt = $pdo->prepare('SELECT id FROM players WHERE name = ?');
$stmt->execute([$username]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Nome de jogador já existe.']);
    exit;
}
// Cria a conta
$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('INSERT INTO accounts (name, password, email) VALUES (?, ?, ?)');
$stmt->execute([$username, $hash, $email]);
$account_id = $pdo->lastInsertId();
// Cria o jogador
$stmt = $pdo->prepare('INSERT INTO players (name, account_id, group_id, world_id, level, vocation, health, healthmax, experience, lookbody, lookfeet, lookhead, looklegs, looktype, lookaddons, maglevel, mana, manamax, manaspent, soul, town_id, posx, posy, posz, conditions, cap, sex, rank_id) VALUES (?, ?, 1, 0, 1, 0, 100, 100, 0, 10, 10, 10, 10, 136, "default", 0, 100, 100, 0, 0, 1, 100, 100, 7, '', 0, 0, 0)');
$stmt->execute([$username, $account_id]);
echo json_encode(['success' => true]);
