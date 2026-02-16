<?php
header('Content-Type: application/json');
require 'db.php';

function getLoggedAccountId() {
    $cookie = $_COOKIE['account_id'] ?? null;
    if ($cookie === null) return null;
    if (!is_string($cookie) || $cookie === '' || !ctype_digit($cookie)) return null;
    return (int)$cookie;
}

$accountId = getLoggedAccountId();
if ($accountId === null) {
    echo json_encode(['success' => false, 'message' => 'Not logged in']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT group_id FROM accounts WHERE id = ?');
    $stmt->execute([$accountId]);
    $row = $stmt->fetch();
    $groupId = isset($row['group_id']) ? (int)$row['group_id'] : 0;

    echo json_encode([
        'success' => true,
        'account_id' => $accountId,
        'group_id' => $groupId
    ]);
} catch (Throwable $e) {
    echo json_encode(['success' => false, 'message' => 'DB error']);
}
