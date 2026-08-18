const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

if (localStorage.getItem('loveUser')) window.location.href = '/dashboard.html';

loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    loginError.textContent = '';
    const button = loginForm.querySelector('button');
    button.disabled = true;
    try {
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: document.getElementById('loginInput').value, password: document.getElementById('passwordInput').value }) });
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Проверьте данные');
        localStorage.setItem('loveUser', result.user);
        window.location.href = '/dashboard.html';
    } catch (error) {
        loginError.textContent = error.message;
        button.disabled = false;
    }
});
