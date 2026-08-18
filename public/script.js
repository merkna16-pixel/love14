const currentUser = localStorage.getItem('loveUser');
let appData = null;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const formatNumber = value => new Intl.NumberFormat('ru-RU').format(value || 0);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

if (!currentUser) window.location.href = '/';

function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}
function openTab(tab) {
    $$('.nav-tab').forEach(button => button.classList.toggle('active', button.dataset.tab === tab));
    $$('.tab-content').forEach(section => section.classList.toggle('active', section.id === `tab-${tab}`));
    history.replaceState(null, '', `#${tab}`);
}
async function api(url, options = {}) {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const result = await response.json();
    if (!response.ok || result.success === false) throw new Error(result.error || 'Не удалось выполнить действие');
    return result;
}
function renderTasks(target, limit = 0) {
    const tasks = appData.tasks.filter(task => task.date === new Date().toISOString().slice(0, 10));
    const shown = limit ? tasks.slice(0, limit) : tasks;
    const html = shown.length ? shown.map(task => {
        const status = task.confirmed ? 'Готово обоим' : task.done ? (task.author === currentUser ? 'Ждёт подтверждения' : 'Можно подтвердить') : 'Ещё не начато';
        const action = task.confirmed ? '<span class="task-meta">✓  +10 монет</span>' : task.done && task.author !== currentUser ? `<button class="task-action confirm" data-confirm-task="${task.id}">Подтвердить</button>` : task.done ? '<span class="task-meta">Ожидает второго</span>' : `<button class="task-action" data-do-task="${task.id}">Я сделал ♥</button>`;
        return `<div class="task-row"><button class="task-check ${task.confirmed ? 'done' : ''}" aria-label="${escapeHtml(status)}">${task.confirmed ? '✓' : '·'}</button><span class="task-text">${escapeHtml(task.text)}</span><span class="task-meta">${escapeHtml(status)}</span>${action}</div>`;
    }).join('') : '<div class="panel"><p>Сегодняшние задания уже ждут своего часа.</p></div>';
    target.innerHTML = html;
}
function renderDashboard() {
    const { users, stats, goals } = appData;
    $('#currentUser').textContent = currentUser;
    $('#daysTogether').textContent = formatNumber(stats.daysTogether);
    $('#streakDays').textContent = stats.streak;
    $('#coinsYakub').textContent = formatNumber(users['Якуб'].coins);
    $('#coinsSonya').textContent = formatNumber(users['Соня'].coins);
    $('#coinsCombined').textContent = formatNumber(users['Якуб'].coins + users['Соня'].coins);
    $('#coinsTotal').textContent = formatNumber(users['Якуб'].coins + users['Соня'].coins);
    $('#todayLabel').textContent = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const goal = goals[0]; $('#goalTitle').textContent = goal.title; $('#goalCurrent').textContent = formatNumber(goal.current); $('#goalTarget').textContent = formatNumber(goal.target); $('#goalProgress').style.width = `${Math.min(100, goal.current / goal.target * 100)}%`;
    renderTasks($('#homeTasks'), 3); renderMemory();
}
function renderMemory() {
    const monthAgo = Date.now() - 30 * 86400000;
    const memory = appData.photos.find(photo => new Date(photo.date).getTime() <= monthAgo);
    $('#memoryContent').innerHTML = memory ? `<img src="${memory.image}" alt="${escapeHtml(memory.description || 'Воспоминание')}"><span class="memory-empty">${escapeHtml(memory.description || 'Наш момент')}</span>` : '<span class="memory-empty">Первое фото станет воспоминанием<br>через месяц ♥</span>';
}
function renderShop() {
    $('#shopContainer').innerHTML = appData.shop.map(item => `<article class="shop-item"><span class="shop-emoji">${item.emoji}</span><h3>${escapeHtml(item.name)}</h3><p>${formatNumber(item.price)} 🪙</p><button data-buy="${item.id}">Выбрать ↗</button></article>`).join('');
}
function renderCalendar() {
    $('#datesForm').innerHTML = appData.dates.map(item => `<div class="date-field"><label>${item.emoji} ${escapeHtml(item.title)}</label><input type="date" name="${item.id}" value="${item.date || ''}"></div>`).join('') + '<button type="submit">Сохранить даты <span>↗</span></button>';
    const purchases = appData.purchases.map(item => `<div class="event-item"><span>${item.emoji}</span><div><b>${escapeHtml(item.name)}</b><small>${item.date} · ${escapeHtml(item.buyer)}</small></div></div>`).join('');
    const dates = appData.dates.filter(item => item.date).map(item => `<div class="event-item"><span>${item.emoji}</span><div><b>${escapeHtml(item.title)}</b><small>${item.date}</small></div></div>`).join('');
    $('#eventsContainer').innerHTML = '<p class="eyebrow">Ближайшие события</p>' + (dates + purchases || '<p>Пока нет событий.</p>');
}
function renderPhotos() {
    $('#photosContainer').innerHTML = appData.photos.length ? appData.photos.map(photo => `<article class="photo-card"><img src="${photo.image}" alt="${escapeHtml(photo.description)}"><div><p>${escapeHtml(photo.description || 'Без подписи')}</p><small>${escapeHtml(photo.author)} · ${new Date(photo.date).toLocaleDateString('ru-RU')}</small></div></article>`).join('') : '<div class="panel"><p>Добавьте первый момент, который хочется сохранить.</p></div>';
}
function renderHistory() {
    $('#historyContainer').innerHTML = appData.history.length ? appData.history.slice(0, 30).map(item => `<div class="history-item"><time>${item.date}</time><p>${escapeHtml(item.text)}</p></div>`).join('') : '<div class="panel"><p>История начнёт заполняться с первого задания.</p></div>';
    $('#achievementsContainer').innerHTML = appData.achievements.map(item => `<div class="achievement ${item.unlocked ? 'unlocked' : ''}"><span>${item.emoji}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.condition)}</small></div></div>`).join('');
}
async function loadData() { appData = await api('/api/data'); renderDashboard(); renderTasks($('#tasksContainer')); renderShop(); renderCalendar(); renderPhotos(); renderHistory(); }
async function handleAction(event) {
    const doButton = event.target.closest('[data-do-task]');
    const confirmButton = event.target.closest('[data-confirm-task]');
    const buyButton = event.target.closest('[data-buy]');
    try {
        if (doButton) await api('/api/task/do', { method: 'POST', body: JSON.stringify({ taskId: doButton.dataset.doTask, user: currentUser }) });
        if (confirmButton) await api('/api/task/confirm', { method: 'POST', body: JSON.stringify({ taskId: confirmButton.dataset.confirmTask, user: currentUser }) });
        if (buyButton) { const date = prompt('На какую дату запланировать событие?', new Date().toISOString().slice(0, 10)); if (!date) return; await api('/api/shop/buy', { method: 'POST', body: JSON.stringify({ itemId: buyButton.dataset.buy, buyer: currentUser, date }) }); }
        if (doButton || confirmButton || buyButton) { showToast('Сохранено ♥'); await loadData(); }
    } catch (error) { showToast(error.message); }
}

document.addEventListener('click', event => { const tab = event.target.closest('[data-tab]'); const open = event.target.closest('[data-open-tab]'); if (tab) openTab(tab.dataset.tab); if (open) openTab(open.dataset.openTab); if (event.target.closest('[data-action="edit-goal"]')) { const value = prompt('Сколько монет уже накоплено?', appData.goals[0].current); if (value !== null) api('/api/goals/update', { method: 'POST', body: JSON.stringify({ id: appData.goals[0].id, current: value }) }).then(loadData).then(() => showToast('Цель обновлена ♥')).catch(error => showToast(error.message)); } handleAction(event); });
$('#logoutBtn').addEventListener('click', () => { localStorage.removeItem('loveUser'); window.location.href = '/'; });
$('#datesForm').addEventListener('submit', async event => { event.preventDefault(); const body = Object.fromEntries(new FormData(event.target)); try { await api('/api/dates/save', { method: 'POST', body: JSON.stringify(body) }); showToast('Даты сохранены ♥'); await loadData(); } catch (error) { showToast(error.message); } });
$('#photoForm').addEventListener('submit', async event => { event.preventDefault(); const file = $('#photoInput').files[0]; if (!file) { $('#photoError').textContent = 'Выберите фотографию'; return; } const reader = new FileReader(); reader.onload = async () => { try { await api('/api/photos', { method: 'POST', body: JSON.stringify({ author: currentUser, description: $('#photoDescription').value, image: reader.result }) }); $('#photoForm').reset(); $('#photoError').textContent = ''; showToast('Момент сохранён ♥'); await loadData(); } catch (error) { $('#photoError').textContent = error.message; } }; reader.readAsDataURL(file); });
const initialTab = location.hash.replace('#', '') || 'home'; openTab(initialTab); loadData().catch(() => showToast('Не удалось загрузить данные'));
