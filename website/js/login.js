function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Se já estiver logado por cookie, manda pro painel
const existingAccountId = getCookie('account_id');
if (existingAccountId || localStorage.getItem('account_id')) {
    window.location.replace('player.php');
}

const t = (key, vars) => (window.I18N && typeof window.I18N.t === 'function' ? window.I18N.t(key, vars) : key);

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    fetch('backend/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('account_id', data.account_id);
            localStorage.setItem('username', data.username);
            localStorage.setItem('email', data.email);

            // Cookie de apoio para persistir login no site
            document.cookie = `account_id=${data.account_id}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
            document.cookie = `username=${encodeURIComponent(data.username)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;

            window.location.replace('player.php');
        } else {
            document.getElementById('login-error').textContent = data.message || t('login.invalid');
        }
    })
    .catch(() => {
        document.getElementById('login-error').textContent = t('login.serverError');
    });
});