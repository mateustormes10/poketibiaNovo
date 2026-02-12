<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.home">Chaotic - Home</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="home-hero">
                <div class="home-hero__inner">
                    <p class="home-hero__kicker" data-i18n="home.kicker">MMORPG • Mundo persistente • Progressão e desafios</p>
                    <h1 class="home-hero__title">Chaotic</h1>
                    <p class="home-hero__subtitle" data-i18n="home.subtitle">Entre no mundo de Chaotic e acompanhe as últimas notícias do servidor. Crie sua conta, faça login e prepare-se para a próxima aventura.</p>
                    <div class="hero-actions">
                        <a class="primary-cta" href="register.php" data-i18n="home.createAccount">Criar conta</a>
                        <a class="secondary-cta" href="login.php" data-i18n="home.signIn">Entrar</a>
                    </div>
                </div>
            </section>

            <section class="news-section">
                <h2 class="news-title" data-i18n="home.news">Notícias</h2>
                <table class="news-table" id="news-table">
                    <thead>
                        <tr>
                            <th data-i18n="home.news.date">Data</th>
                            <th data-i18n="home.news.title">Título</th>
                            <th data-i18n="home.news.content">Conteúdo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Notícias serão carregadas via JS -->
                    </tbody>
                </table>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>
    <script src="js/news.js"></script>
</body>
</html>
