document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.querySelector('#ranking-table tbody');
    const worldSelect = document.getElementById('world_id');
    const t = (key, vars) => (window.I18N && typeof window.I18N.t === 'function' ? window.I18N.t(key, vars) : key);

    function load() {
        const params = new URLSearchParams();
        if (worldSelect && worldSelect.value !== '') {
            params.set('world_id', worldSelect.value);
        }

        const url = params.toString() ? `backend/ranking.php?${params.toString()}` : 'backend/ranking.php';

        fetch(url)
            .then(res => res.json())
            .then(data => {
                tbody.innerHTML = '';
                (data || []).forEach((player, idx) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${idx + 1}</td><td>${player.name}</td><td>${player.level}</td><td>${player.experience}</td>`;
                    tbody.appendChild(tr);
                });

                if (!data || data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4">${t('ranking.none')}</td></tr>`;
                }
            })
            .catch(() => {
                tbody.innerHTML = `<tr><td colspan="4">${t('ranking.loadError')}</td></tr>`;
            });
    }

    if (worldSelect) {
        worldSelect.addEventListener('change', load);
    }

    load();
});