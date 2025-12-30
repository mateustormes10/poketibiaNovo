<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chaotic - Home</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="news-section">
                <h2 class="news-title">Notícias</h2>
                <table class="news-table" id="news-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Título</th>
                            <th>Conteúdo</th>
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
        <p>&copy; 2025 Chaotic. Todos os direitos reservados.</p>
    </footer>
    <script src="js/news.js"></script>
    <script>
    // Responsividade do menu lateral (sidebar)
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    function openSidebar() {
        sidebar.classList.add('open');
        document.body.classList.add('sidebar-open');
        sidebarBackdrop.style.display = 'block';
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        sidebarBackdrop.style.display = 'none';
    }
    sidebarToggle.addEventListener('click', openSidebar);
    sidebarBackdrop.addEventListener('click', closeSidebar);
    window.addEventListener('resize', function() {
        if(window.innerWidth > 900) {
            closeSidebar();
        }
    });
    </script>
</body>
</html>
