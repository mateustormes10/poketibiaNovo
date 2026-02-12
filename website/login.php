<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.login">Login - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title" data-i18n="login.header">Login</h2>
                <div class="account-box">
                    <form id="login-form">
                        <label for="username" data-i18n="login.username">Usuário</label>
                        <input type="text" id="username" name="username" required>
                        <label for="password" data-i18n="login.password">Senha</label>
                        <input type="password" id="password" name="password" required>
                        <button type="submit" class="account-btn" style="margin-top:1rem;" data-i18n="login.submit">Entrar</button>
                        <div id="login-error" class="error-message"></div>
                    </form>
                        
                    <button class="account-btn" style="width: 100%;" onclick="window.location.href='register.php'" data-i18n="login.createAccount">Criar Conta</button>
                </div>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>
    <script src="js/login.js"></script>
</body>
</html>