<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title">Login</h2>
                <div class="account-box">
                    <form id="login-form">
                        <label for="username">Usuário</label>
                        <input type="text" id="username" name="username" required>
                        <label for="password">Senha</label>
                        <input type="password" id="password" name="password" required>
                        <button type="submit" class="account-btn" style="margin-top:1rem;">Entrar</button>
                        <div id="login-error" class="error-message"></div>
                    </form>
                </div>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. Todos os direitos reservados.</p>
    </footer>
    <script src="js/login.js"></script>
</body>
</html>