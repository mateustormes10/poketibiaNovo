<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.player">Menu do Jogador - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title" data-i18n="player.header">Account Management</h2>
                <div class="account-welcome" id="account-welcome">
                    <!-- Bem-vindo, nome da conta -->
                </div>
                <div class="account-box">
                    <div class="account-status-title" data-i18n="player.accountStatus">Account Status</div>
                    <div class="account-status-row">
                        <div class="account-status-icon" id="account-status-icon"></div>
                        <div class="account-status-info" id="account-status-info">
                            <!-- Premium/Free, expiração, saldo -->
                        </div>
                        <div class="account-status-actions">
                            <button class="account-btn" id="manage-account-btn" data-i18n="player.manageAccount">Manage Account</button>
                            <button class="account-btn logout-btn" id="logout-btn" data-i18n="player.logout">Logout</button>
                        </div>
                    </div>
                </div>
                <div class="account-box">
                    <div class="account-status-title" data-i18n="player.downloadClient">Download Client</div>
                    <div class="account-download-row" id="account-download-row">
                        Click <a href="#" class="download-link">here</a> to download the latest Chaotic client!
                    </div>
                </div>
                <div class="account-box">
                    <div class="account-status-title" data-i18n="player.characters">Characters</div>
                    <table class="characters-table" id="characters-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th data-i18n="player.table.name">Name</th>
                                <th data-i18n="player.table.voc">Voc/Level/World</th>
                                <th data-i18n="player.table.status">Status</th>
                                <th data-i18n="player.table.actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Linhas de personagens via JS -->
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>
    <script src="js/player.js"></script>
</body>
</html>