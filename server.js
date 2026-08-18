const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const START_DATE = '2024-01-01';
const USERS = {
    'Якуб': { name: 'Якуб', password: '01.09', coins: 500 },
    'Соня': { name: 'Соня', password: '25.08', coins: 500 }
};
const extraTasks = ['❤️ Обнять', '🍳 Приготовить завтрак', '🎬 Посмотреть фильм', '🚶 Прогуляться вместе', '💆 Сделать массаж', '☕ Приготовить кофе'];
const shop = [
    { id: 'cafe', name: 'Свидание в кафе', price: 300, emoji: '☕' },
    { id: 'snacks', name: 'Купить вкусняшки', price: 150, emoji: '🍫' },
    { id: 'movie', name: 'Совместный фильм', price: 100, emoji: '🎬' },
    { id: 'gift', name: 'Подарок', price: 500, emoji: '🎁' }
];
const state = {
    users: Object.fromEntries(Object.values(USERS).map(user => ({ ...user, coins: 500 })).map(user => [user.name, user])),
    tasks: [], purchases: [], history: [], photos: [], dates: [
        { id: 'meeting', title: 'День знакомства', date: '2024-01-01', emoji: '❤️' },
        { id: 'anniversary', title: 'Годовщина', date: '2025-01-01', emoji: '🎂' },
        { id: 'yakub-birthday', title: 'День рождения Якуба', date: '', emoji: '🎈' },
        { id: 'sonya-birthday', title: 'День рождения Сони', date: '', emoji: '🎈' }
    ],
    goals: [{ id: 'trip', title: 'Поездка', current: 5000, target: 10000, emoji: '✈️' }],
    achievements: [
        { id: 'first-task', title: 'Первое задание', emoji: '🌱', condition: 'Выполнено первое задание' },
        { id: 'ten-tasks', title: '10 заданий', emoji: '🔥', condition: 'Выполнено 10 заданий' },
        { id: 'hundred-tasks', title: '100 заданий', emoji: '💯', condition: 'Выполнено 100 заданий' },
        { id: 'thirty-days', title: '30 дней вместе', emoji: '🌙', condition: 'Вместе уже 30 дней' },
        { id: 'first-date', title: 'Первое свидание', emoji: '🥂', condition: 'Куплено первое свидание' },
        { id: 'thousand-coins', title: '1000 монет', emoji: '🪙', condition: 'Заработано 1000 монет' }
    ]
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const today = () => new Date().toISOString().slice(0, 10);
const normalize = value => String(value || '').trim().toLowerCase();
const daysTogether = () => Math.max(0, Math.floor((Date.now() - new Date(START_DATE)) / 86400000));
const totalCompleted = () => state.tasks.filter(task => task.confirmed).length;
const totalEarned = () => state.history.filter(item => item.type === 'reward').length * 10;
function ensureTodayTasks() {
    const date = today();
    if (state.tasks.some(task => task.date === date)) return;
    const seed = Date.now();
    state.tasks.push(
        { id: `${seed}-morning`, text: '☀️ Пожелать доброе утро', date, done: false, confirmed: false, author: null },
        { id: `${seed}-night`, text: '🌙 Пожелать спокойной ночи', date, done: false, confirmed: false, author: null },
        { id: `${seed}-extra`, text: extraTasks[Math.floor(Math.random() * extraTasks.length)], date, done: false, confirmed: false, author: null }
    );
}
function unlockAchievements() {
    const completed = totalCompleted();
    const earned = totalEarned();
    const conditions = {
        'first-task': completed >= 1, 'ten-tasks': completed >= 10, 'hundred-tasks': completed >= 100,
        'thirty-days': daysTogether() >= 30, 'first-date': state.purchases.some(item => item.id === 'cafe'), 'thousand-coins': earned >= 1000
    };
    state.achievements.forEach(item => { if (conditions[item.id]) item.unlocked = true; });
}
function snapshot() {
    ensureTodayTasks();
    unlockAchievements();
    return { users: state.users, tasks: state.tasks, purchases: state.purchases, history: state.history, dates: state.dates, goals: state.goals, achievements: state.achievements, shop, photos: state.photos, stats: { daysTogether: daysTogether(), streak: totalCompleted() ? 1 : 0, completedTasks: totalCompleted(), earnedCoins: totalEarned(), purchases: state.purchases.length } };
}
function addHistory(text, type = 'activity', extra = {}) { state.history.unshift({ id: Date.now() + Math.random(), date: today(), text, type, ...extra }); }
function validUser(name) { return Object.prototype.hasOwnProperty.call(state.users, name); }

app.get('/api/data', (req, res) => res.json(snapshot()));
app.post('/api/login', (req, res) => {
    const login = Object.keys(state.users).find(name => normalize(name) === normalize(req.body.login));
    if (login && state.users[login].password === String(req.body.password || '').trim()) return res.json({ success: true, user: login });
    res.json({ success: false, error: 'Неверный логин или пароль' });
});
app.post('/api/task/do', (req, res) => {
    const task = state.tasks.find(item => item.id === req.body.taskId);
    if (!task || !validUser(req.body.user) || task.confirmed || task.done) return res.status(400).json({ success: false, error: 'Задание уже отмечено' });
    task.done = true; task.author = req.body.user;
    addHistory(`💌 ${req.body.user} выполнил(а): ${task.text}`, 'activity');
    res.json({ success: true });
});
app.post('/api/task/confirm', (req, res) => {
    const task = state.tasks.find(item => item.id === req.body.taskId);
    if (!task || !task.done || task.confirmed || task.author === req.body.user || !validUser(req.body.user)) return res.status(400).json({ success: false, error: 'Нельзя подтвердить это задание' });
    task.confirmed = true;
    Object.values(state.users).forEach(user => { user.coins += 10; });
    addHistory(`✅ ${req.body.user} подтвердил(а): ${task.text}`, 'reward');
    res.json({ success: true });
});
app.post('/api/shop/buy', (req, res) => {
    const item = shop.find(product => product.id === req.body.itemId);
    const buyer = state.users[req.body.buyer];
    if (!item || !buyer || buyer.coins < item.price || !/^\d{4}-\d{2}-\d{2}$/.test(req.body.date)) return res.status(400).json({ success: false, error: 'Проверьте товар, дату и баланс' });
    buyer.coins -= item.price;
    state.purchases.unshift({ ...item, buyer: buyer.name, date: req.body.date, createdAt: new Date().toISOString() });
    addHistory(`🎁 ${buyer.name} выбрал(а) «${item.name}» на ${req.body.date}`, 'purchase');
    res.json({ success: true });
});
app.post('/api/goals/update', (req, res) => {
    const goal = state.goals.find(item => item.id === req.body.id);
    const current = Number(req.body.current);
    if (!goal || !Number.isFinite(current) || current < 0) return res.status(400).json({ success: false });
    goal.current = Math.min(current, goal.target); addHistory(`🎯 Обновлена цель «${goal.title}»`, 'activity'); res.json({ success: true });
});
app.post('/api/dates/save', (req, res) => {
    state.dates.forEach(item => { if (Object.hasOwn(req.body, item.id)) item.date = String(req.body[item.id] || ''); });
    addHistory('📅 Обновлены важные даты', 'activity'); res.json({ success: true });
});
app.post('/api/photos', (req, res) => {
    const { author, description, image } = req.body;
    if (!validUser(author) || !image || !String(image).startsWith('data:image/')) return res.status(400).json({ success: false, error: 'Добавьте фотографию' });
    state.photos.unshift({ id: Date.now(), author, description: String(description || ''), image, date: new Date().toISOString() });
    addHistory(`📸 ${author} добавил(а) новый момент`, 'photo'); res.json({ success: true });
});
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`Love App запущен на порту ${PORT}`));
