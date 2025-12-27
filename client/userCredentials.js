// userCredentials.js
// Armazena e recupera usuário e senha localmente

export function saveCredentials(username, password) {
    localStorage.setItem('chaoswar_username', username);
    localStorage.setItem('chaoswar_password', password);
}

export function getCredentials() {
    return {
        username: localStorage.getItem('chaoswar_username') || '',
        password: localStorage.getItem('chaoswar_password') || ''
    };
}
