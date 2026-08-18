document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();
    const login = document.getElementById('loginInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const errorEl = document.getElementById('loginError');
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        
        // ✅ Проверяем статус ответа
        if (!res.ok) {
            errorEl.textContent = '❌ Ошибка сервера (статус: ' + res.status + ')';
            errorEl.style.display = 'block';
            return;
        }
        
        const result = await res.json();
        
        if (result.success) {
            localStorage.setItem('loveUser', result.user);
            window.location.href = '/dashboard.html';
        } else {
            errorEl.textContent = '❌ Неверный логин или пароль';
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = '❌ Ошибка подключения к серверу';
        errorEl.style.display = 'block';
        console.error('Login error:', error);
    }
}