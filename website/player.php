<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menu do Jogador - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title">Account Management</h2>
                <div class="account-welcome" id="account-welcome">
                    <!-- Bem-vindo, nome da conta -->
                </div>
                <div class="account-box">
                    <div class="account-status-title">Account Status</div>
                    <div class="account-status-row">
                        <div class="account-status-icon" id="account-status-icon"></div>
                        <div class="account-status-info" id="account-status-info">
                            <!-- Premium/Free, expiração, saldo -->
                        </div>
                        <div class="account-status-actions">
                            <button class="account-btn" id="manage-account-btn">Manage Account</button>
                            <button class="account-btn logout-btn" id="logout-btn">Logout</button>
                        </div>
                    </div>
                </div>
                <div class="account-box">
                    <div class="account-status-title">Download Client</div>
                    <div class="account-download-row">
                        Click <a href="#" class="download-link">here</a> to download the latest Chaotic client!
                    </div>
                </div>
                <div class="account-box">
                    <div class="account-status-title">Characters</div>
                    <table class="characters-table" id="characters-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Voc/Level/World</th>
                                <th>Status</th>
                                <th>Actions</th>
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
        <p>&copy; 2025 Chaotic. Todos os direitos reservados.</p>
    </footer>
    <script src="js/player.js"></script>
</body>
</html>