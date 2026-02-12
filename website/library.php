<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title data-i18n="title.library">Library - Chaotic</title>
    <link rel="stylesheet" href="assets/style.css">
</head>
<body>
    <div class="main-layout">
        <?php include 'sidebar.html'; ?>
        <main class="main-content">
            <section class="account-section">
                <h2 class="account-title" data-i18n="library.header">Library</h2>
                <div class="account-box">
                    <p data-i18n="library.intro">Guia rápido do mundo: quests, NPCs e houses (com coordenadas) para ajudar na sua jornada.</p>
                </div>

                <div class="account-box">
                    <div class="account-status-title" data-i18n="library.quests">Quests (iniciais)</div>
                    <ul style="margin:0; padding-left: 18px; color: rgba(232,225,207,0.92);">
                        <li data-i18n-html="library.quest1"><b>Primeiros passos</b>: crie a conta, faça login e acesse seu painel.</li>
                        <li data-i18n-html="library.quest2"><b>Economia</b>: encontre o NPC <b>Vendedor</b> para comprar itens básicos.</li>
                        <li data-i18n-html="library.quest3"><b>Sobrevivência</b>: procure a <b>Enfermeira</b> para recuperar HP quando necessário.</li>
                    </ul>
                </div>

                <div class="account-box">
                    <div class="account-status-title" data-i18n="library.npcs">NPCs</div>
                    <table class="news-table" style="margin-top: 10px;">
                        <thead>
                            <tr>
                                <th data-i18n="library.npcs.name">Nome</th>
                                <th data-i18n="library.npcs.type">Tipo</th>
                                <th data-i18n="library.npcs.coords">Coordenadas</th>
                                <th data-i18n="library.npcs.world">World</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Vendedor</td>
                                <td>Shop</td>
                                <td>(x: 9, y: 2, z: 2)</td>
                                <td>0</td>
                            </tr>
                            <tr>
                                <td>Enfermeira</td>
                                <td>Heal</td>
                                <td>(x: 18, y: 2, z: 2)</td>
                                <td>0</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="account-box">
                    <div class="account-status-title" data-i18n="library.houses">Houses (exemplos)</div>
                    <p style="margin-top:0; color: rgba(232,225,207,0.85);" data-i18n="library.houses.desc">Casas padrão de exemplo (CidadeInicial). Porta e área de aluguel em coordenadas do mapa.</p>
                    <table class="news-table" style="margin-top: 10px;">
                        <thead>
                            <tr>
                                <th data-i18n="library.houses.id">ID</th>
                                <th data-i18n="library.houses.city">Cidade</th>
                                <th data-i18n="library.houses.door">Porta</th>
                                <th data-i18n="library.houses.area">Área</th>
                                <th data-i18n="library.houses.floor">Andar</th>
                                <th data-i18n="library.houses.size">Tamanho</th>
                                <th data-i18n="library.houses.rent">Aluguel</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>CidadeInicial</td>
                                <td>(10, 10, 3)</td>
                                <td>De (11,10) até (15,14)</td>
                                <td>3</td>
                                <td>25 sqm</td>
                                <td>500</td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>CidadeInicial</td>
                                <td>(20, 8, 3)</td>
                                <td>De (21,8) até (26,12)</td>
                                <td>3</td>
                                <td>30 sqm</td>
                                <td>650</td>
                            </tr>
                            <tr>
                                <td>3</td>
                                <td>CidadeInicial</td>
                                <td>(5, 20, 3)</td>
                                <td>De (6,20) até (10,24)</td>
                                <td>3</td>
                                <td>20 sqm</td>
                                <td>400</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    </div>
    <footer>
        <p>&copy; 2025 Chaotic. <span data-i18n="footer.rights">Todos os direitos reservados.</span></p>
    </footer>
</body>
</html>
