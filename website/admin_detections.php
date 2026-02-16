<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Detections - Admin</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
<?php
require __DIR__ . '/backend/db.php';

function h($value) {
    return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function truncateText($value, $maxLen = 220) {
    $text = (string)($value ?? '');
    if ($text === '') return '';
    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        if (mb_strlen($text, 'UTF-8') <= $maxLen) return $text;
        return mb_substr($text, 0, $maxLen, 'UTF-8') . '…';
    }
    if (strlen($text) <= $maxLen) return $text;
    return substr($text, 0, $maxLen) . '…';
}

function getLoggedAccountId() {
    $cookie = $_COOKIE['account_id'] ?? null;
    if ($cookie === null) return null;
    if (!is_string($cookie) || $cookie === '' || !ctype_digit($cookie)) return null;
    return (int)$cookie;
}

function isAdminAccount(PDO $pdo, int $accountId, int $minGroupId) {
    $stmt = $pdo->prepare('SELECT group_id FROM accounts WHERE id = ?');
    $stmt->execute([$accountId]);
    $row = $stmt->fetch();
    $groupId = isset($row['group_id']) ? (int)$row['group_id'] : 0;
    return $groupId >= $minGroupId;
}

$ADMIN_MIN_GROUP_ID = 2;

$accountId = getLoggedAccountId();
$isAllowed = false;
if ($accountId !== null) {
    try {
        $isAllowed = isAdminAccount($pdo, $accountId, $ADMIN_MIN_GROUP_ID);
    } catch (Throwable $e) {
        $isAllowed = false;
    }
}

$ipFilter = trim((string)($_GET['ip'] ?? ''));
$playerFilter = trim((string)($_GET['player'] ?? ''));

$rows = [];
$queryError = null;

if ($isAllowed) {
    $where = [];
    $params = [];

    if ($ipFilter !== '') {
        $where[] = 'ip = ?';
        $params[] = $ipFilter;
    }

    if ($playerFilter !== '') {
        if (ctype_digit($playerFilter)) {
            $where[] = '(player_db_id = ? OR player_id = ?)';
            $params[] = (int)$playerFilter;
            $params[] = $playerFilter;
        } else {
            $where[] = 'player_id = ?';
            $params[] = $playerFilter;
        }
    }

    $sql = 'SELECT id, created_at, player_db_id, player_id, client_id, ip, user_agent, event_type, severity, details FROM detection_events';
    if (count($where) > 0) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY created_at DESC, id DESC LIMIT 200';

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
    } catch (Throwable $e) {
        $queryError = $e->getMessage();
        $rows = [];
    }
}
?>

    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="ranking-section">
                <h2>Detections (Admin)</h2>

                <?php if ($accountId === null): ?>
                    <div class="error-message">Você precisa estar logado para acessar esta página.</div>
                <?php elseif (!$isAllowed): ?>
                    <div class="error-message">Acesso negado. (Requer group_id &gt;= <?php echo h($ADMIN_MIN_GROUP_ID); ?>)</div>
                <?php else: ?>
                    <form method="GET" style="margin-bottom: 12px;">
                        <label for="ip">IP</label>
                        <input type="text" id="ip" name="ip" value="<?php echo h($ipFilter); ?>" placeholder="Ex: 127.0.0.1">

                        <label for="player">Player (ID ou player_db_id)</label>
                        <input type="text" id="player" name="player" value="<?php echo h($playerFilter); ?>" placeholder="Ex: player_123 ou 42">

                        <button type="submit">Filtrar</button>
                    </form>

                    <?php if ($queryError): ?>
                        <div class="error-message">Erro ao buscar detections: <?php echo h($queryError); ?></div>
                    <?php endif; ?>

                    <table id="ranking-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>IP</th>
                                <th>Player</th>
                                <th>Tipo</th>
                                <th>Sev</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (!$rows || count($rows) === 0): ?>
                                <tr>
                                    <td colspan="6" style="color: var(--muted);">Nenhum evento encontrado.</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($rows as $r):
                                    $details = (string)($r['details'] ?? '');
                                    $detailsShort = truncateText($details, 220);
                                    $playerLabel = '';
                                    if (!empty($r['player_id'])) {
                                        $playerLabel = (string)$r['player_id'];
                                    } elseif (!empty($r['player_db_id'])) {
                                        $playerLabel = 'db:' . (string)$r['player_db_id'];
                                    } else {
                                        $playerLabel = '-';
                                    }
                                ?>
                                <tr>
                                    <td><?php echo h($r['created_at'] ?? ''); ?></td>
                                    <td><?php echo h($r['ip'] ?? ''); ?></td>
                                    <td title="<?php echo h('player_id=' . ($r['player_id'] ?? '') . ' player_db_id=' . ($r['player_db_id'] ?? '') . ' client_id=' . ($r['client_id'] ?? '') ); ?>">
                                        <?php echo h($playerLabel); ?>
                                    </td>
                                    <td><?php echo h($r['event_type'] ?? ''); ?></td>
                                    <td><?php echo h($r['severity'] ?? ''); ?></td>
                                    <td title="<?php echo h($details); ?>"><?php echo h($detailsShort); ?></td>
                                </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. Todos os direitos reservados.</p>
    </footer>
</body>
</html>
