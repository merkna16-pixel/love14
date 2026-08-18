# Love App

Приватное веб-приложение для Якуба и Сони: ежедневные задания, общие монеты, желания, даты, цели, достижения и фотоальбом.

## Запуск

```bash
npm install
npm start
```

Откройте `http://localhost:3000`. Доступы:

- `Якуб` / `01.09`
- `Соня` / `25.08`

Сейчас приложение запускается без внешних сервисов в локальном fallback-режиме, поэтому его можно проверить сразу после клонирования. Для Render задайте `PORT` при необходимости; Express слушает `0.0.0.0`.

## API

- `POST /api/login`
- `GET /api/data`
- `POST /api/task/do`
- `POST /api/task/confirm`
- `POST /api/shop/buy`
- `POST /api/goals/update`
- `POST /api/dates/save`
- `POST /api/photos`
