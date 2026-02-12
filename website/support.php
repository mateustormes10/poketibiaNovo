<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.support">Support - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title" data-i18n="support.header">Support</h2>
                <div class="account-box">
                    <p data-i18n="support.intro">Precisa de ajuda? Envie um ticket para o suporte.</p>
                </div>

                <div class="account-box">
                    <form id="support-form">
                        <label for="support-category" data-i18n="support.category">Categoria</label>
                        <select id="support-category" name="category" required>
                            <option value="bug" data-i18n="support.cat.bug">Bug / Erro</option>
                            <option value="technical" data-i18n="support.cat.technical">Problema técnico</option>
                            <option value="account" data-i18n="support.cat.account">Conta / Login</option>
                            <option value="report" data-i18n="support.cat.report">Denúncia</option>
                            <option value="payment" data-i18n="support.cat.payment">Premium / Pagamento</option>
                            <option value="other" data-i18n="support.cat.other">Outros</option>
                        </select>

                        <label for="support-title" data-i18n="support.title">Título</label>
                        <input type="text" id="support-title" name="title" maxlength="80" required>

                        <label for="support-message" data-i18n="support.message">Mensagem</label>
                        <textarea id="support-message" name="message" rows="6" maxlength="2000" required></textarea>

                        <button type="submit" class="account-btn" style="margin-top:1rem;" data-i18n="support.submit">Enviar</button>
                        <div id="support-result" class="error-message"></div>
                    </form>
                </div>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>

    <script src="js/support.js"></script>
</body>
</html>
