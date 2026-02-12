<?php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

function json_error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function json_ok($data = []) {
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function get_logged_account_id() {
    if (!empty($_COOKIE['account_id']) && ctype_digit((string)$_COOKIE['account_id'])) {
        return (int)$_COOKIE['account_id'];
    }
    return null;
}

function require_login() {
    $accountId = get_logged_account_id();
    if (!$accountId) {
        json_error('Você precisa estar logado para realizar esta ação.', 401);
    }
    return $accountId;
}

$action = $_GET['action'] ?? '';

try {
    if ($action === 'list_categories') {
        $stmt = $pdo->query('SELECT id, name, description, position, is_locked, created_at FROM categories ORDER BY position ASC, name ASC');
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        json_ok(['categories' => $categories]);
    }

    if ($action === 'list_topics') {
        $categoryId = $_GET['category_id'] ?? null;
        if (!$categoryId || !ctype_digit((string)$categoryId)) {
            json_error('category_id inválido.');
        }
        $categoryId = (int)$categoryId;

        $page = $_GET['page'] ?? '1';
        $page = (ctype_digit((string)$page) && (int)$page > 0) ? (int)$page : 1;
        $limit = 30;
        $offset = ($page - 1) * $limit;

        $catStmt = $pdo->prepare('SELECT id, name, description, is_locked FROM categories WHERE id = ?');
        $catStmt->execute([$categoryId]);
        $category = $catStmt->fetch(PDO::FETCH_ASSOC);
        if (!$category) {
            json_error('Categoria não encontrada.', 404);
        }

        $countStmt = $pdo->prepare('SELECT COUNT(*) AS total FROM topics WHERE category_id = ?');
        $countStmt->execute([$categoryId]);
        $total = (int)($countStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

        $stmt = $pdo->prepare(
            'SELECT 
                t.id,
                t.title,
                t.is_locked,
                t.views,
                t.created_at,
                t.updated_at,
                t.author_account_id,
                a.name AS author_username,
                (SELECT GREATEST(COUNT(*) - 1, 0) FROM posts p WHERE p.topic_id = t.id) AS replies,
                (SELECT p2.created_at FROM posts p2 WHERE p2.topic_id = t.id ORDER BY p2.created_at DESC LIMIT 1) AS last_post_at,
                (
                    SELECT a2.name
                    FROM posts p3
                    INNER JOIN accounts a2 ON a2.id = p3.author_account_id
                    WHERE p3.topic_id = t.id
                    ORDER BY p3.created_at DESC
                    LIMIT 1
                ) AS last_post_by
            FROM topics t
            INNER JOIN accounts a ON a.id = t.author_account_id
            WHERE t.category_id = ?
            ORDER BY COALESCE(t.updated_at, t.created_at) DESC
            LIMIT ? OFFSET ?'
        );
        $stmt->bindValue(1, $categoryId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $topics = $stmt->fetchAll(PDO::FETCH_ASSOC);

        json_ok([
            'category' => $category,
            'topics' => $topics,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total
            ]
        ]);
    }

    if ($action === 'get_topic') {
        $topicId = $_GET['topic_id'] ?? null;
        if (!$topicId || !ctype_digit((string)$topicId)) {
            json_error('topic_id inválido.');
        }
        $topicId = (int)$topicId;

        $topicStmt = $pdo->prepare(
            'SELECT 
                t.id,
                t.title,
                t.category_id,
                t.is_locked,
                t.views,
                t.created_at,
                t.updated_at,
                t.author_account_id,
                a.name AS author_username,
                c.name AS category_name
            FROM topics t
            INNER JOIN accounts a ON a.id = t.author_account_id
            INNER JOIN categories c ON c.id = t.category_id
            WHERE t.id = ?'
        );
        $topicStmt->execute([$topicId]);
        $topic = $topicStmt->fetch(PDO::FETCH_ASSOC);
        if (!$topic) {
            json_error('Tópico não encontrado.', 404);
        }

        // incrementa views
        $pdo->prepare('UPDATE topics SET views = views + 1 WHERE id = ?')->execute([$topicId]);
        $topic['views'] = (int)$topic['views'] + 1;

        $viewerAccountId = get_logged_account_id();
        if ($viewerAccountId) {
            $postsStmt = $pdo->prepare(
                'SELECT 
                    p.id,
                    p.content,
                    p.created_at,
                    p.updated_at,
                    p.author_account_id,
                    a.name AS author_username,
                    (SELECT COUNT(*) FROM posts p3 WHERE p3.author_account_id = p.author_account_id) AS author_posts,
                    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = "like") AS likes,
                    (SELECT COUNT(*) FROM reactions r2 WHERE r2.post_id = p.id AND r2.type = "like" AND r2.account_id = ?) AS liked_by_me
                FROM posts p
                INNER JOIN accounts a ON a.id = p.author_account_id
                WHERE p.topic_id = ?
                ORDER BY p.created_at ASC'
            );
            $postsStmt->execute([$viewerAccountId, $topicId]);
        } else {
            $postsStmt = $pdo->prepare(
                'SELECT 
                    p.id,
                    p.content,
                    p.created_at,
                    p.updated_at,
                    p.author_account_id,
                    a.name AS author_username,
                    (SELECT COUNT(*) FROM posts p3 WHERE p3.author_account_id = p.author_account_id) AS author_posts,
                    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.type = "like") AS likes,
                    0 AS liked_by_me
                FROM posts p
                INNER JOIN accounts a ON a.id = p.author_account_id
                WHERE p.topic_id = ?
                ORDER BY p.created_at ASC'
            );
            $postsStmt->execute([$topicId]);
        }
        $posts = $postsStmt->fetchAll(PDO::FETCH_ASSOC);

        json_ok(['topic' => $topic, 'posts' => $posts]);
    }

    if ($action === 'create_topic') {
        $accountId = require_login();

        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) {
            json_error('JSON inválido.');
        }

        $categoryId = $body['category_id'] ?? null;
        $title = trim((string)($body['title'] ?? ''));
        $content = trim((string)($body['content'] ?? ''));

        if (!$categoryId || !ctype_digit((string)$categoryId)) {
            json_error('category_id inválido.');
        }
        $categoryId = (int)$categoryId;

        if (mb_strlen($title) < 3 || mb_strlen($title) > 140) {
            json_error('O título deve ter entre 3 e 140 caracteres.');
        }
        if (mb_strlen($content) < 3) {
            json_error('A mensagem deve ter pelo menos 3 caracteres.');
        }

        $catStmt = $pdo->prepare('SELECT id, is_locked FROM categories WHERE id = ?');
        $catStmt->execute([$categoryId]);
        $category = $catStmt->fetch(PDO::FETCH_ASSOC);
        if (!$category) {
            json_error('Categoria não encontrada.', 404);
        }
        if ((int)$category['is_locked'] === 1) {
            json_error('Esta categoria está trancada.');
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('INSERT INTO topics (category_id, author_account_id, title) VALUES (?, ?, ?)');
            $stmt->execute([$categoryId, $accountId, $title]);
            $topicId = (int)$pdo->lastInsertId();

            $stmt2 = $pdo->prepare('INSERT INTO posts (topic_id, author_account_id, content) VALUES (?, ?, ?)');
            $stmt2->execute([$topicId, $accountId, $content]);

            $pdo->commit();
            json_ok(['topic_id' => $topicId]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    if ($action === 'create_post') {
        $accountId = require_login();

        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) {
            json_error('JSON inválido.');
        }

        $topicId = $body['topic_id'] ?? null;
        $content = trim((string)($body['content'] ?? ''));

        if (!$topicId || !ctype_digit((string)$topicId)) {
            json_error('topic_id inválido.');
        }
        $topicId = (int)$topicId;

        if (mb_strlen($content) < 1) {
            json_error('A mensagem não pode ficar vazia.');
        }

        $topicStmt = $pdo->prepare('SELECT id, is_locked FROM topics WHERE id = ?');
        $topicStmt->execute([$topicId]);
        $topic = $topicStmt->fetch(PDO::FETCH_ASSOC);
        if (!$topic) {
            json_error('Tópico não encontrado.', 404);
        }
        if ((int)$topic['is_locked'] === 1) {
            json_error('Este tópico está trancado.');
        }

        $stmt = $pdo->prepare('INSERT INTO posts (topic_id, author_account_id, content) VALUES (?, ?, ?)');
        $stmt->execute([$topicId, $accountId, $content]);

        // "bump" do tópico
        $pdo->prepare('UPDATE topics SET updated_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$topicId]);

        json_ok(['post_id' => (int)$pdo->lastInsertId()]);
    }

    if ($action === 'react') {
        $accountId = require_login();

        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true);
        if (!is_array($body)) {
            json_error('JSON inválido.');
        }

        $postId = $body['post_id'] ?? null;
        $type = trim((string)($body['type'] ?? 'like'));

        if (!$postId || !ctype_digit((string)$postId)) {
            json_error('post_id inválido.');
        }
        $postId = (int)$postId;

        if ($type !== 'like') {
            json_error('Tipo de reação inválido.');
        }

        // toggle like
        $exists = $pdo->prepare('SELECT id FROM reactions WHERE post_id = ? AND account_id = ? AND type = ?');
        $exists->execute([$postId, $accountId, $type]);
        $row = $exists->fetch(PDO::FETCH_ASSOC);

        $liked = false;
        if ($row) {
            $pdo->prepare('DELETE FROM reactions WHERE id = ?')->execute([(int)$row['id']]);
        } else {
            $pdo->prepare('INSERT INTO reactions (post_id, account_id, type) VALUES (?, ?, ?)')->execute([$postId, $accountId, $type]);
            $liked = true;
        }

        $cnt = $pdo->prepare('SELECT COUNT(*) AS c FROM reactions WHERE post_id = ? AND type = ?');
        $cnt->execute([$postId, $type]);
        $likes = (int)($cnt->fetch(PDO::FETCH_ASSOC)['c'] ?? 0);

        json_ok(['likes' => $likes, 'liked' => $liked]);
    }

    json_error('Ação inválida.', 404);
} catch (Throwable $e) {
    json_error('Erro interno: ' . $e->getMessage(), 500);
}
