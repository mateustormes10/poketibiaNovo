<?php
header('Content-Type: application/json');
require 'db.php';
$stmt = $pdo->query('SELECT username, level, points FROM players ORDER BY points DESC, level DESC LIMIT 50');
echo json_encode($stmt->fetchAll());
