<?php
header('Content-Type: application/json');
// Exemplo de notícias estáticas, troque por banco depois se quiser
echo json_encode([
    [
        'date' => '2025-12-30',
        'title' => 'Bem-vindo ao Chaotic!',
        'content' => 'O servidor está online! Prepare-se para aventuras e novidades.'
    ],
    [
        'date' => '2025-12-28',
        'title' => 'Evento de Fim de Ano',
        'content' => 'Participe do evento especial de fim de ano e ganhe recompensas exclusivas!'
    ]
]);
