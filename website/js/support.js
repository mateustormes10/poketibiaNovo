document.addEventListener('DOMContentLoaded', () => {
    const t = (key, vars) => (window.I18N && typeof window.I18N.t === 'function' ? window.I18N.t(key, vars) : key);

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    const accountId = getCookie('account_id') || localStorage.getItem('account_id');
    const form = document.getElementById('support-form');
    const result = document.getElementById('support-result');

    if (!form || !result) return;

    if (!accountId) {
        result.textContent = t('support.loginRequired');
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;
        return;
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        result.textContent = '';

        const category = document.getElementById('support-category')?.value;
        const title = document.getElementById('support-title')?.value?.trim();
        const message = document.getElementById('support-message')?.value?.trim();

        fetch('backend/support.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: accountId, category, title, message })
        })
            .then((r) => r.json())
            .then((data) => {
                if (!data.success) {
                    result.textContent = data.message || t('support.sendError');
                    return;
                }
                result.style.color = '#2ecc71';
                result.textContent = t('support.sent');
                form.reset();
                setTimeout(() => {
                    result.style.color = '';
                }, 1500);
            })
            .catch(() => {
                result.textContent = t('support.serverError');
            });
    });
});
