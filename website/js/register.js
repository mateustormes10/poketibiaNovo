document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const t = (key, vars) => (window.I18N && typeof window.I18N.t === 'function' ? window.I18N.t(key, vars) : key);
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;
    fetch('backend/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.location.href = 'login.php';
        } else {
            document.getElementById('register-error').textContent = data.message || t('register.error');
        }
    })
    .catch(() => {
        document.getElementById('register-error').textContent = t('register.serverError');
    });
});