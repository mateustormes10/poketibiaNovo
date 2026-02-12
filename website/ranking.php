<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.ranking">Ranking - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="ranking-section">
                <h2 data-i18n="ranking.header">Ranking dos Jogadores</h2>
                <form id="ranking-filter" style="margin-bottom: 12px;">
                    <label for="world_id" data-i18n="ranking.world">World</label>
                    <select id="world_id" name="world_id">
                        <option value="" data-i18n="ranking.all">Todos</option>
                        <option value="0">Main (0)</option>
                        <option value="1">World 1</option>
                        <option value="2">World 2</option>
                        <option value="3">World 3</option>
                    </select>
                </form>
                <table id="ranking-table">
                    <thead>
                        <tr>
                            <th data-i18n="ranking.position">Posição</th>
                            <th data-i18n="ranking.player">Jogador</th>
                            <th data-i18n="ranking.level">Nível</th>
                            <th data-i18n="ranking.experience">Experiência</th>
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
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>
    <script src="js/ranking.js"></script>
</body>
</html>