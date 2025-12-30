document.addEventListener('DOMContentLoaded', () => {
    fetch('backend/ranking.php')
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector('#ranking-table tbody');
            tbody.innerHTML = '';
            data.forEach((player, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${idx + 1}</td><td>${player.username}</td><td>${player.level}</td><td>${player.points}</td>`;
                tbody.appendChild(tr);
            });
        })
        .catch(() => {
            document.querySelector('#ranking-table tbody').innerHTML = '<tr><td colspan="4" style="color:#c9a14a;font-weight:bold;text-shadow:1px 1px 4px #0a1833,0 0 4px #fff;">Erro ao carregar ranking.</td></tr>';
        });
});