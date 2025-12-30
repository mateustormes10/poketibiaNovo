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
            window.location.replace('player.php');
        } else {
            document.getElementById('login-error').textContent = data.message || 'Usuário ou senha inválidos.';
        }
    })
    .catch(() => {
        document.getElementById('login-error').textContent = 'Erro ao conectar ao servidor.';
    });
});