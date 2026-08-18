const API_URL = window.location.origin + '/api';
let currentUser = localStorage.getItem('loveUser');
let data = null;

if (!currentUser) {
    window.location.href = '/';
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('currentUser').textContent = currentUser;
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById('tab-' + this.dataset.tab).classList.add('active');
        });
    });
    
    loadData();
    setInterval(loadData, 5000);
});

function logout() {
    localStorage.removeItem('loveUser');
    window.location.href = '/';
}

async function loadData() {
    try {
        const res = await fetch('/api/data');
        
        if (!res.ok) {
            console.error('Ошибка загрузки данных:', res.status);
            return;
        }
        
        data = await res.json();
        renderAll();
    } catch (error) {
        console.error('Ошибка загрузки:', error);
    }
}

function renderAll() {
    if (!data) return;
    
    document.getElementById('coinsYakub').textContent = data.users['Якуб'].coins;
    document.getElementById('coinsSonya').textContent = data.users['Соня'].coins;
    
    document.getElementById('daysTogether').textContent = Math.floor((new Date() - new Date('2024-01-01')) / (1000 * 60 * 60 * 24));
    document.getElementById('streakDays').textContent = data.streak || 0;
    
    renderTasks();
    renderShop();
    renderHistory();
}

function renderTasks() {
    const container = document.getElementById('tasksContainer');
    const today = new Date().toISOString().split('T')[0];
    const tasks = data.tasks.filter(t => t.date === today);
    
    if (tasks.length === 0) {
        container.innerHTML = '<p>🎉 Сегодня нет заданий</p>';
        return;
    }
    
    let html = '';
    tasks.forEach(task => {
        let status = '❌';
        let actions = '';
        
        if (task.done && task.confirmed) {
            status = '✅ Выполнено';
        } else if (task.done && !task.confirmed) {
            status = '🟡 Ожидает подтверждения';
            if (task.author !== currentUser) {
                actions = `<button onclick="confirmTask('${task.id}')">✅ Подтвердить</button>`;
            } else {
                actions = `⏳ ждёт подтверждения`;
            }
        } else {
            actions = `<button onclick="doTask('${task.id}')">Я сделал ❤️</button>`;
        }
        
        html += `<div class="task-item"><span>${task.text}</span><span>${status}</span>${actions}</div>`;
    });
    container.innerHTML = html;
}

async function doTask(taskId) {
    try {
        const res = await fetch('/api/task/do', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, user: currentUser })
        });
        
        if (!res.ok) {
            console.error('Ошибка выполнения задания');
            return;
        }
        
        await loadData();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function confirmTask(taskId) {
    try {
        const res = await fetch('/api/task/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId, user: currentUser })
        });
        
        if (!res.ok) {
            console.error('Ошибка подтверждения');
            return;
        }
        
        await loadData();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function renderShop() {
    const container = document.getElementById('shopContainer');
    let html = '';
    data.shop.forEach(item => {
        html += `<div><span>${item.name}</span><span>${item.price}🪙</span><button onclick="buyItem('${item.name}', ${item.price})">Купить</button></div>`;
    });
    container.innerHTML = html;
}

async function buyItem(name, price) {
    const date = prompt('Введите дату (ГГГГ-ММ-ДД):', new Date().toISOString().split('T')[0]);
    if (!date) return;
    
    try {
        const res = await fetch('/api/shop/buy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemName: name, price, buyer: currentUser, date })
        });
        
        if (!res.ok) {
            console.error('Ошибка покупки');
            return;
        }
        
        await loadData();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function renderHistory() {
    const container = document.getElementById('historyContainer');
    const history = data.history.slice(-10).reverse();
    container.innerHTML = history.map(h => `<div>${h.text} (${h.date})</div>`).join('');
}