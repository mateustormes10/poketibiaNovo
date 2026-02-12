document.addEventListener('DOMContentLoaded', () => {
    const t = (key, vars) => (window.I18N && typeof window.I18N.t === 'function' ? window.I18N.t(key, vars) : key);

    function escapeHtml(text) {
        return String(text)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    const account_id = getCookie('account_id') || localStorage.getItem('account_id');
    console.log('account_id do localStorage:', account_id);
    if (!account_id) {
        // window.location.href = 'login.php';
        // return;
    }
    const charactersTbody = document.querySelector('#characters-table tbody');

    const downloadRowEarly = document.getElementById('account-download-row');
    if (downloadRowEarly) {
        const hereLink = `<a href="#" class="download-link">${escapeHtml(t('common.here'))}</a>`;
        downloadRowEarly.innerHTML = t('player.downloadText', { here: hereLink });
    }

    function vocationName(vocationId) {
        const mapping = {
            0: 'Rookie',
            1: 'Sorcerer',
            2: 'Druid',
            3: 'Paladin',
            4: 'Knight'
        };
        return mapping[vocationId] ?? `Vocation ${vocationId}`;
    }

    function worldName(worldId) {
        if (worldId === 0) return 'Main';
        return `World ${worldId}`;
    }

    function renderCharacters(players) {
        if (!charactersTbody) return;

        if (!Array.isArray(players) || players.length === 0) {
            charactersTbody.innerHTML = `<tr><td colspan="5">${t('player.noCharacters')}</td></tr>`;
            return;
        }

        let tbody = '';
        players.forEach((player, index) => {
            const statusDot = player.online
                ? '<span style="color: #2ecc71;">●</span>'
                : '<span style="color: #ff5c5c;">●</span>';

            tbody += `<tr>
                <td>${index + 1}</td>
                <td>${player.name}</td>
                <td><span style='font-size:0.95em;color:#b6ae9c;'>${escapeHtml(t('player.row.vocLevelWorld', {
                    voc: vocationName(Number(player.vocation)),
                    level: player.level,
                    world: worldName(Number(player.world_id)),
                }))}</span></td>
                <td>${statusDot}</td>
                <td>
                    <a href="#" data-action="edit" data-player-id="${player.id}" style="color:#06c;">[${escapeHtml(t('player.action.edit'))}]</a>
                    <a href="#" data-action="delete" data-player-id="${player.id}" style="color:#a00;">[${escapeHtml(t('player.action.delete'))}]</a>
                </td>
            </tr>`;
        });

        charactersTbody.innerHTML = tbody;
    }

    function setAccountInfo(account) {
        const welcome = document.getElementById('account-welcome');
        const statusIcon = document.getElementById('account-status-icon');
        const statusInfo = document.getElementById('account-status-info');

        if (welcome) welcome.innerHTML = t('player.welcome', { name: escapeHtml(account?.name ?? '') });

        // Premium: por enquanto usamos premdays (se existir). Ajuste quando tiver premend/premend timestamp.
        const premdays = Number(account?.premdays ?? 0);
        const isPremium = premdays > 0;

        if (statusIcon) {
            statusIcon.innerHTML = isPremium
                ? '<span style="color: #2ecc71; font-weight: 700;">●</span>'
                : '<span style="color: #ff5c5c; font-weight: 700;">●</span>';
        }

        if (statusInfo) {
            statusInfo.innerHTML = isPremium
                ? `<span style="color:#2ecc71;font-size:1.05em;font-weight:800;">${escapeHtml(t('player.premium'))}</span><br>${escapeHtml(t('player.premiumBalance', { days: premdays }))}`
                : `<span style="color:#b6ae9c;font-size:1.05em;font-weight:800;">${escapeHtml(t('player.free'))}</span>`;
        }
    }

    function api(body) {
        return fetch('backend/player.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id, ...body })
        }).then(res => res.json());
    }

    function load() {
        api({ action: 'list' })
            .then(data => {
                if (!data.success) {
                    // window.location.href = 'login.php';
                    return;
                }
                setAccountInfo(data.account);
                renderCharacters(data.players);
            })
            .catch(() => {
                // window.location.href = 'login.php';
            });
    }

    load();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            document.cookie = 'account_id=; path=/; max-age=0; samesite=lax';
            document.cookie = 'username=; path=/; max-age=0; samesite=lax';
            localStorage.removeItem('account_id');
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            window.location.href = 'login.php';
        });
    }

    const manageAccountBtn = document.getElementById('manage-account-btn');
    if (manageAccountBtn) {
        manageAccountBtn.addEventListener('click', function () {
            window.location.href = 'support.php';
        });
    }

    if (charactersTbody) {
        charactersTbody.addEventListener('click', function (e) {
            const link = e.target.closest('a[data-action]');
            if (!link) return;
            e.preventDefault();

            const action = link.getAttribute('data-action');
            const playerId = link.getAttribute('data-player-id');
            if (!playerId) return;

            if (action === 'delete') {
                const ok = window.confirm(t('player.confirmDelete'));
                if (!ok) return;

                api({ action: 'delete', player_id: Number(playerId) })
                    .then(resp => {
                        if (!resp.success) {
                            alert(resp.message || t('player.deleteError'));
                            return;
                        }
                        load();
                    })
                    .catch(() => alert(t('player.deleteError')));
            }

            if (action === 'edit') {
                const newName = window.prompt(t('player.renamePrompt'));
                if (!newName) return;

                api({ action: 'rename', player_id: Number(playerId), new_name: newName })
                    .then(resp => {
                        if (!resp.success) {
                            alert(resp.message || t('player.renameError'));
                            return;
                        }
                        load();
                    })
                    .catch(() => alert(t('player.renameError')));
            }
        });
    }
});