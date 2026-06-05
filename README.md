# Викторина в реальном времени

Учебный MVP-проект: интерактивная викторина для нескольких игроков с вопросами в реальном времени, таймером, leaderboard и простой админ-панелью.

## Стек

- Frontend: Vue 3 + Vite
- Backend: Node.js + Express + Socket.IO
- Хранилище рейтинга: Redis
- Язык: JavaScript без TypeScript

## Возможности

- игрок вводит nickname и подключается к общей викторине;
- вопросы показываются всем активным игрокам одновременно;
- на каждый вопрос есть таймер;
- ответы отправляются через Socket.IO;
- сервер начисляет баллы;
- leaderboard хранит лучший результат игрока за одну попытку;
- отображается top-5 игроков;
- есть кнопка "Начать заново";
- есть кнопка "Выйти";
- есть выезжающая admin-панель.

## Структура проекта

```text
victorina/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminPanel.vue
│   │   │   ├── Leaderboard.vue
│   │   │   ├── NicknameForm.vue
│   │   │   ├── QuizQuestion.vue
│   │   │   └── RestartButton.vue
│   │   ├── socket/
│   │   │   └── socket.js
│   │   ├── App.vue
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── data/
│   │   │   └── questions.js
│   │   ├── game/
│   │   │   ├── gameState.js
│   │   │   └── scoring.js
│   │   ├── redis/
│   │   │   └── redisClient.js
│   │   ├── sockets/
│   │   │   └── quizSocket.js
│   │   ├── app.js
│   │   └── index.js
│   ├── .env.example
│   └── package.json
│
└── README.md
```

## За что отвечают основные файлы

`client/src/App.vue` - главный компонент frontend. Хранит состояние экрана, подключает Socket.IO-события и собирает интерфейс.

`client/src/components/NicknameForm.vue` - форма ввода nickname.

`client/src/components/QuizQuestion.vue` - карточка вопроса, варианты ответа, таймер и результат ответа.

`client/src/components/Leaderboard.vue` - таблица top-5 игроков.

`client/src/components/AdminPanel.vue` - выезжающая admin-панель справа.

`client/src/socket/socket.js` - подключение frontend к backend через Socket.IO.

`server/src/index.js` - запуск HTTP-сервера, Express и Socket.IO.

`server/src/app.js` - настройка Express и CORS.

`server/src/sockets/quizSocket.js` - основная логика викторины: подключение игроков, старт игры, ответы, таймер, перезапуск, admin-события.

`server/src/game/gameState.js` - состояние текущей игры: игроки, номер вопроса, статус игры, таймер, отвеченные игроки.

`server/src/game/scoring.js` - проверка ответа и начисление баллов.

`server/src/redis/redisClient.js` - работа с Redis leaderboard.

`server/src/data/questions.js` - список вопросов.

## Запуск проекта

### 1. Запустить Redis

Если установлен Docker:

```bash
docker run --name victorina-redis -p 6379:6379 -d redis
```

Если контейнер уже создан, его можно запустить так:

```bash
docker start victorina-redis
```

### 2. Запустить backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Backend запускается на:

```text
http://localhost:3000
```

### 3. Запустить frontend

В отдельном терминале:

```bash
cd client
npm install
npm run dev
```

Frontend запускается на:

```text
http://localhost:5173
```

## Переменные окружения backend

Файл `server/.env.example`:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

## Как работает игра

1. Пользователь вводит nickname.
2. Frontend отправляет событие `joinGame`.
3. Сервер добавляет игрока в активные игроки.
4. Игрок нажимает "Начать игру".
5. Frontend отправляет `startGame`.
6. Сервер отправляет всем первый вопрос через `newQuestion`.
7. Игрок выбирает ответ.
8. Frontend отправляет `submitAnswer`.
9. Сервер проверяет ответ и отправляет игроку `answerResult`.
10. После ответа всех игроков или окончания таймера сервер переходит к следующему вопросу.
11. После последнего вопроса сервер отправляет `gameOver`.

## Таймер вопросов

На каждый вопрос дается заданное количество секунд. По умолчанию это 20 секунд.

Сервер отправляет во frontend:

```text
durationSeconds
endsAt
```

Frontend считает оставшееся время по `endsAt`. Это нужно, чтобы таймер был синхронизирован с сервером.

Если игрок не ответил за время, сервер отправляет `answerResult` с `isTimeout: true`. Игрок получает 0 очков за этот вопрос.

## Leaderboard

Leaderboard хранится в Redis.

Важная логика:

- хранится лучший результат игрока за одну попытку;
- ключ игрока в рейтинге - `nickname`;
- если новая попытка хуже старой, рейтинг не меняется;
- если новая попытка лучше старой, рейтинг обновляется;
- frontend показывает только top-5 игроков.

Пример:

```text
Было: 4
Новая попытка: 3
В leaderboard остается: 4

Было: 4
Новая попытка: 5
В leaderboard становится: 5
```

## Admin-панель

Кнопка `⚙ Админ` находится в правом верхнем углу и показывается только когда викторина не идет.

Admin-код для MVP хранится на frontend:

```text
123
```

В admin-панели можно:

- изменить время на вопрос: 10, 15, 20 или 30 секунд;
- очистить leaderboard;
- перезапустить викторину;
- обновить статистику;
- посмотреть количество активных игроков;
- посмотреть текущий вопрос;
- посмотреть, идет ли игра;
- посмотреть текущее время на вопрос.

При нажатии "Выйти" admin-доступ в текущей вкладке сбрасывается. При новом входе под другим nickname admin-код нужно вводить заново.

## Socket.IO-события

### Frontend отправляет

```text
joinGame
startGame
submitAnswer
restartGame
updateQuestionDuration
clearLeaderboard
getAdminStats
```

### Frontend слушает

```text
joinedGame
gameStarted
newQuestion
answerResult
leaderboardUpdated
gameOver
gameRestarted
gameError
settingsUpdated
adminStats
```

## Основные состояния frontend

- `login` - экран ввода nickname;
- `waiting` - игрок подключен и ждет старта;
- `question` - идет вопрос;
- `gameOver` - викторина завершена.

## Проверка работы проекта

1. Запустить две вкладки браузера.
2. Ввести два разных nickname.
3. Начать викторину.
4. Показать синхронный вопрос у двух игроков.
5. Ответить правильно в одной вкладке и неправильно в другой.
6. Показать галочку, крестик и правильный ответ.
7. Не отвечать на вопрос и показать тайм-аут.
8. Показать обновление leaderboard.
9. Открыть admin-панель кодом `123`.
10. Изменить время вопроса.
11. Очистить leaderboard.
12. Нажать "Выйти" и показать возврат к форме nickname.

## Проверка сборки frontend

```bash
cd client
npm run build
```

## Простая идея проекта

Проект разделен на две части:

- frontend отвечает за интерфейс и действия пользователя;
- backend отвечает за правила игры, проверку ответов, таймер и leaderboard.

Redis используется только для хранения рейтинга. Текущее состояние викторины хранится в памяти backend, потому что это учебный MVP.
