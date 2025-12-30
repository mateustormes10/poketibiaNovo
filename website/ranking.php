<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ranking - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="ranking-section">
                <h2>Ranking dos Jogadores</h2>
                <table id="ranking-table">
                    <thead>
                        <tr>
                            <th>Posição</th>
                            <th>Jogador</th>
                            <th>Nível</th>
                            <th>Pontos</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Dados do ranking serão inseridos via JS -->
                    </tbody>
                </table>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. Todos os direitos reservados.</p>
    </footer>
    <script src="js/ranking.js"></script>
</body>
</html>