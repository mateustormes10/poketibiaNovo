<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.register">Criar Conta - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title" data-i18n="register.header">Criar Conta</h2>
                <div class="account-box">
                    <form id="register-form">
                        <label for="username" data-i18n="register.username">Usuário</label>
                        <input type="text" id="username" name="username" required>
                        <label for="password" data-i18n="register.password">Senha</label>
                        <input type="password" id="password" name="password" required>
                        <label for="email" data-i18n="register.email">E-mail</label>
                        <input type="email" id="email" name="email" required>
                        <button type="submit" class="account-btn" style="margin-top:1rem;" data-i18n="register.submit">Registrar</button>
                        <div id="register-error" class="error-message"></div>
                    </form>
                </div>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>
    <script src="js/register.js"></script>
</body>
</html>