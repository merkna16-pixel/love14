require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// ============ SUPABASE ============
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: SUPABASE_URL и SUPABASE_KEY не установлены');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============ API ============

// Получить все данные
app.get('/api/data', async (req, res) => {
    try {
        const [users, tasks, purchases, history, goals, achievements, shop] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('tasks').select('*'),
            supabase.from('purchases').select('*'),
            supabase.from('history').select('*'),
            supabase.from('goals').select('*'),
            supabase.from('achievements').select('*'),
            supabase.from('shop').select('*')
        ]);

        const usersMap = {};
        users.data.forEach(u => {
            usersMap[u.name] = { password: u.password, coins: u.coins };
        });

        res.json({
            users: usersMap,
            tasks: tasks.data || [],
            purchases: purchases.data || [],
            history: history.data || [],
            goals: goals.data || [],
            achievements: achievements.data || [],
            shop: shop.data || [],
            startDate: '2024-01-01',
            streak: 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка чтения базы данных' });
    }
});

// Логин
app.post('/api/login', async (req, res) => {
    try {
        const { login, password } = req.body;
        console.log(`🔐 Попытка входа: ${login}`);
        
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('name', login)
            .eq('password', password);

        if (error) {
            console.error('❌ Ошибка Supabase:', error);
            return res.status(500).json({ success: false, error: 'Ошибка БД' });
        }

        if (users && users.length > 0) {
            console.log(`✅ Вход успешен: ${login}`);
            res.json({ success: true, user: login });
        } else {
            console.log(`❌ Пользователь не найден: ${login}`);
            res.json({ success: false });
        }
    } catch (error) {
        console.error('❌ Ошибка при логине:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Выполнить задание
app.post('/api/task/do', async (req, res) => {
    const { taskId, user } = req.body;
    await supabase
        .from('tasks')
        .update({ done: true, author: user, pending: true })
        .eq('id', taskId);

    await supabase.from('history').insert({
        date: new Date().toISOString().split('T')[0],
        text: `✅ ${user} выполнил(а) задание`
    });

    res.json({ success: true });
});

// Подтвердить задание
app.post('/api/task/confirm', async (req, res) => {
    const { taskId, user } = req.body;
    const REWARD = 10;

    const { data: task } = await supabase
        .from('tasks')
        .update({ confirmed: true, pending: false })
        .eq('id', taskId)
        .eq('done', true)
        .eq('confirmed', false)
        .neq('author', user)
        .select();

    if (task && task.length > 0) {
        await supabase.rpc('add_coins', { user1: 'Якуб', user2: 'Соня', amount: REWARD });
        await supabase.from('history').insert({
            date: new Date().toISOString().split('T')[0],
            text: `✅ ${user} подтвердил(а) задание (+${REWARD}🪙)`
        });
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Купить товар
app.post('/api/shop/buy', async (req, res) => {
    const { itemName, price, buyer, date } = req.body;

    const { data: userData } = await supabase
        .from('users')
        .select('coins')
        .eq('name', buyer);

    if (!userData || userData[0].coins < price) {
        return res.json({ success: false, error: 'Недостаточно монет' });
    }

    await supabase
        .from('users')
        .update({ coins: userData[0].coins - price })
        .eq('name', buyer);

    await supabase.from('purchases').insert({
        name: itemName,
        price: price,
        buyer: buyer,
        date: date,
        created_at: new Date().toISOString()
    });

    await supabase.from('history').insert({
        date: new Date().toISOString().split('T')[0],
        text: `🎁 ${buyer} купил(а): ${itemName} (на ${date})`
    });

    res.json({ success: true });
});

// Обновить цель
app.post('/api/goals/update', async (req, res) => {
    const { index, current } = req.body;
    const { data: goals } = await supabase.from('goals').select('id');
    if (goals && goals[index]) {
        await supabase.from('goals').update({ current }).eq('id', goals[index].id);
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Сохранить даты
app.post('/api/dates/save', async (req, res) => {
    const { meeting, anniversary, birthdayYakub, birthdaySonya } = req.body;
    await supabase.from('history').delete().eq('type', 'date');
    const entries = [];
    if (meeting) entries.push({ date: meeting, text: '❤️ День знакомства', type: 'date' });
    if (anniversary) entries.push({ date: anniversary, text: '🎂 Годовщина', type: 'date' });
    if (birthdayYakub) entries.push({ date: birthdayYakub, text: '🎂 День рождения Якуба', type: 'date' });
    if (birthdaySonya) entries.push({ date: birthdaySonya, text: '🎂 День рождения Сони', type: 'date' });
    if (entries.length > 0) await supabase.from('history').insert(entries);
    res.json({ success: true });
});

// Сброс заданий
app.post('/api/tasks/reset', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('tasks').delete().neq('date', today);

    const { data: existing } = await supabase.from('tasks').select('*').eq('date', today);
    if (!existing || existing.length === 0) {
        const extras = ['❤️ Обнять', '🍳 Приготовить завтрак', '🎬 Посмотреть фильм', '🚶 Прогуляться', '💆 Сделать массаж', '☕ Сделать кофе'];
        await supabase.from('tasks').insert([
            { id: Date.now() + '_morning', text: '☀️ Пожелать доброе утро', date: today, done: false, confirmed: false, author: null, pending: false },
            { id: Date.now() + '_night', text: '🌙 Пожелать спокойной ночи', date: today, done: false, confirmed: false, author: null, pending: false },
            { id: Date.now() + '_extra', text: extras[Math.floor(Math.random() * extras.length)], date: today, done: false, confirmed: false, author: null, pending: false }
        ]);
    }
    res.json({ success: true });
});

// ============ ЗАПУСК ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`❤️ Сервер запущен на порту ${PORT}`);
    console.log(`📁 Supabase: ${supabaseUrl}`);
});