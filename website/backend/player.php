<?php
header('Content-Type: application/json');
require 'db.php';
$data = json_decode(file_get_contents('php://input'), true);
$account_id = $data['account_id'] ?? null;
if (!$account_id) {
    echo json_encode(['success' => false]);
    exit;
}
$stmt = $pdo->prepare('SELECT id, name, email FROM accounts WHERE id = ?');
$stmt->execute([$account_id]);
$user = $stmt->fetch();
if ($user) {
    echo json_encode(['success' => true] + $user);
} else {
    echo json_encode(['success' => false]);
}
