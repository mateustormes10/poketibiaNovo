<?php
header('Content-Type: application/json');
require 'db.php';

$data = json_decode(file_get_contents('php://input'), true);

$account_id = $data['account_id'] ?? null;
$category = trim((string)($data['category'] ?? ''));
$title = trim((string)($data['title'] ?? ''));
$message = trim((string)($data['message'] ?? ''));

if (!$account_id || !is_numeric($account_id)) {
    echo json_encode(['success' => false, 'message' => 'account_id inválido']);
    exit;
}
if ($category === '' || $title === '' || $message === '') {
    echo json_encode(['success' => false, 'message' => 'Preencha todos os campos.']);
    exit;
}
if (mb_strlen($title) > 80) {
    echo json_encode(['success' => false, 'message' => 'Título muito longo.']);
    exit;
}
if (mb_strlen($message) > 2000) {
    echo json_encode(['success' => false, 'message' => 'Mensagem muito longa.']);
    exit;
}

// Verifica conta
$stmt = $pdo->prepare('SELECT id FROM accounts WHERE id = ? LIMIT 1');
$stmt->execute([(int)$account_id]);
if (!$stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Conta não encontrada.']);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO support (account_id, category, title, message, status) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([(int)$account_id, $category, $title, $message, 'open']);

echo json_encode(['success' => true]);
