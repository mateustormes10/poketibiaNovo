document.addEventListener('DOMContentLoaded', () => {
    const t = (key, vars) => (window.I18N && typeof window.I18N.t === 'function' ? window.I18N.t(key, vars) : key);

    fetch('news.php')
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector('#news-table tbody');
            tbody.innerHTML = '';
            data.forEach(news => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${news.date}</td><td>${news.title}</td><td>${news.content}</td>`;
                tbody.appendChild(tr);
            });
        })
        .catch(() => {
            document.querySelector('#news-table tbody').innerHTML = `<tr><td colspan="3" style="color:#c9a14a;font-weight:bold;text-shadow:1px 1px 4px #0a1833,0 0 4px #fff;">${t('home.news.loadError')}</td></tr>`;
        });
});
