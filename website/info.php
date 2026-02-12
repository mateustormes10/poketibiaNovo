<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.info">Informações do Game - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title" data-i18n="info.header">Informações do Game</h2>
                <div class="account-box">
                    <p data-i18n="info.intro">Aqui você encontra informações do projeto e do mundo de Chaotic (ChaosWar): sistemas, arquitetura e mecânicas.</p>
                </div>

                <div class="account-box">
                    <div class="account-status-title" data-i18n="info.video">Vídeo</div>
                    <div style="position:relative;padding-top:56.25%;border-radius:14px;overflow:hidden;border:1px solid rgba(201,161,74,0.22);">
                        <iframe
                            src="https://www.youtube.com/embed/pNf2toabNKg"
                            title="Chaotic - Vídeo"
                            data-i18n-title="info.videoFrameTitle"
                            style="position:absolute;inset:0;width:100%;height:100%;border:0;"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        ></iframe>
                    </div>
                </div>

                <div class="account-box">
                    <div class="account-status-title" data-i18n="info.what">O que é o jogo</div>
                    <p style="margin-top:0;" data-i18n="info.what.p1">Chaotic é um MMORPG 2D multiplayer inspirado em experiências estilo Tibia/Pokémon, com foco em mundo persistente, progressão e sistemas server-authoritative.</p>
                    <p style="margin-bottom:0; color: rgba(232,225,207,0.85);" data-i18n="info.what.p2">Arquitetura: o servidor valida tudo; o cliente renderiza e envia intenções (movimento/ações).</p>
                </div>

                <div class="account-box">
                    <div class="account-status-title" data-i18n="info.arch">Arquitetura (cliente/servidor)</div>
                    <ul style="margin:0; padding-left: 18px; color: rgba(232,225,207,0.92);">
                        <li data-i18n-html="info.arch.li1"><b>Backend autoritativo</b>: o servidor decide estado final do jogo.</li>
                        <li data-i18n-html="info.arch.li2"><b>WebSocket</b>: canal em tempo real para estado e eventos.</li>
                        <li data-i18n-html="info.arch.li3"><b>Cliente</b>: captura input, envia intenções e renderiza o estado recebido.</li>
                        <li data-i18n-html="info.arch.li4"><b>Persistência</b>: dados (contas, players, inventário, NPCs/economia) ficam no banco.</li>
                    </ul>
                </div>

                <div class="account-box">
                    <div class="account-status-title" data-i18n="info.systems">Sistemas principais</div>
                    <ul style="margin:0; padding-left: 18px; color: rgba(232,225,207,0.92);">
                        <li data-i18n-html="info.systems.li1"><b>Inventário</b>: grade de slots, atualização sob demanda e controle pelo servidor.</li>
                        <li data-i18n-html="info.systems.li2"><b>Economia</b>: gold coin, NPCs de loja e curandeira (base inicial).</li>
                        <li data-i18n-html="info.systems.li3"><b>Mapas</b>: mapas e colisões centralizados no servidor; client apenas desenha.</li>
                        <li data-i18n-html="info.systems.li4"><b>Progressão</b>: level/experiência e evolução modular para múltiplos “universos”.</li>
                    </ul>
                </div>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>
</body>
</html>
