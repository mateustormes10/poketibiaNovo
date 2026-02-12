<?php
header('Content-Type: application/json');
require 'db.php';
$worldId = $_GET['world_id'] ?? null;

if ($worldId !== null && $worldId !== '' && is_numeric($worldId)) {
	$stmt = $pdo->prepare('SELECT id, name, level, experience, world_id FROM players WHERE deleted = 0 AND world_id = ? ORDER BY level DESC, experience DESC, name ASC LIMIT 50');
	$stmt->execute([(int)$worldId]);
	echo json_encode($stmt->fetchAll());
	exit;
}

$stmt = $pdo->query('SELECT id, name, level, experience, world_id FROM players WHERE deleted = 0 ORDER BY level DESC, experience DESC, name ASC LIMIT 50');
echo json_encode($stmt->fetchAll());
