<?php
header('Content-Type: application/json');
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);

$account_id = $data['account_id'] ?? null;
$action = $data['action'] ?? 'list';

if (!$account_id || !is_numeric($account_id)) {
    echo json_encode(['success' => false, 'message' => 'account_id inválido']);
    exit;
}

function fetchAccount(PDO $pdo, int $accountId) {
    $stmt = $pdo->prepare('SELECT id, name, email, premdays FROM accounts WHERE id = ?');
    $stmt->execute([$accountId]);
    return $stmt->fetch();
}

if ($action === 'rename') {
    $playerId = $data['player_id'] ?? null;
    $newName = trim((string)($data['new_name'] ?? ''));

    if (!$playerId || !is_numeric($playerId) || $newName === '') {
        echo json_encode(['success' => false, 'message' => 'Dados inválidos']);
        exit;
    }
    if (mb_strlen($newName) > 20) {
        echo json_encode(['success' => false, 'message' => 'Nome muito longo']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT id FROM players WHERE name = ? AND deleted = 0 LIMIT 1');
    $stmt->execute([$newName]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Já existe um personagem com esse nome']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE players SET name = ? WHERE id = ? AND account_id = ? AND deleted = 0');
    $stmt->execute([$newName, (int)$playerId, (int)$account_id]);
    if ($stmt->rowCount() < 1) {
        echo json_encode(['success' => false, 'message' => 'Personagem não encontrado']);
        exit;
    }

    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'delete') {
    $playerId = $data['player_id'] ?? null;
    if (!$playerId || !is_numeric($playerId)) {
        echo json_encode(['success' => false, 'message' => 'player_id inválido']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE players SET deleted = 1 WHERE id = ? AND account_id = ? AND deleted = 0');
    $stmt->execute([(int)$playerId, (int)$account_id]);
    if ($stmt->rowCount() < 1) {
        echo json_encode(['success' => false, 'message' => 'Personagem não encontrado']);
        exit;
    }

    echo json_encode(['success' => true]);
    exit;
}

// list (default)
$user = fetchAccount($pdo, (int)$account_id);
if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Conta não encontrada']);
    exit;
}

$stmt = $pdo->prepare('SELECT id, name, world_id, level, vocation, online FROM players WHERE account_id = ? AND deleted = 0 ORDER BY online DESC, level DESC, name ASC');
$stmt->execute([(int)$account_id]);
$players = $stmt->fetchAll();

echo json_encode([
    'success' => true,
    'account' => $user,
    'players' => $players
]);
