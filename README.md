# GameST

Многопользовательская игра на базе Phaser.js и React с серверной частью на Node.js, Colyseus и Supabase.

## Структура проекта

GameST/
├── .github/                    # GitHub Actions и конфигурация CI/CD
├── .vscode/                    # Настройки VS Code
├── dist/                       # Скомпилированные файлы для продакшн
├── logs/                       # Логи приложения
├── public/                     # Статические файлы
├── server/                     # Серверная часть (Node.js + Colyseus)
│   ├── auth.js                # Аутентификация и авторизация
│   ├── config.js              # Конфигурация сервера
│   ├── index.js               # Точка входа сервера
│   └── logger.js              # Настройка логирования
├── src/                        # Клиентская часть (React + Phaser)
│   ├── components/            # React компоненты
│   ├── game/                  # Игровая логика на Phaser
│   ├── hooks/                 # React хуки
│   ├── lib/                   # Общие библиотеки
│   ├── utils/                 # Утилиты
│   ├── App.jsx                # Главный компонент React
│   ├── main.jsx              # Точка входа клиента
│   └── env.d.ts              # Типы для переменных окружения
├── storage/                    # Локальное хранилище файлов
├── supabase/                   # Конфигурация и миграции Supabase
├── volumes/                    # Данные Docker контейнеров
├── vite/                      # Конфигурация и плагины Vite
├── scripts/                    # Скрипты для разработки и деплоя
├── .dockerignore              # Исключения для Docker
├── .editorconfig              # Настройки редактора кода
├── .env                       # Переменные окружения для продакшн
├── .env.example               # Пример переменных окружения
├── .env.local                 # Локальные переменные окружения
├── .eslintrc.cjs             # Конфигурация ESLint
├── .gitignore                # Исключения для Git
├── CHANGELOG.md              # История изменений
├── Dockerfile                # Конфигурация Docker образа
├── LICENSE.md                # Лицензия проекта (MIT)
├── README.md                 # Документация проекта
├── docker-compose.yml        # Конфигурация Docker Compose
├── jest.config.js           # Конфигурация Jest для тестов
├── loki-config.yml          # Конфигурация Loki для логов
├── nginx.conf               # Конфигурация Nginx для продакшн
├── nginx.dev.conf           # Конфигурация Nginx для разработки
├── package.json             # Зависимости и скрипты npm
├── prometheus.yml           # Конфигурация Prometheus
└── vite.config.js          # Конфигурация Vite

## Окружения разработки

Проект поддерживает два окружения:

1. **Development** - для локальной разработки (использует `.env.local`)
2. **Production** - для конечных пользователей (использует `.env` на основе `.env.example` + GitHub Secrets)

## Установка и запуск

### Требования

- Node.js 20+
- Docker и Docker Compose
- Git

### Локальная разработка

1. Клонировать репозиторий:
   ```
   git clone https://github.com/yourusername/GameST.git
   cd GameST
   ```

2. Установить зависимости:
   ```
   npm install
   ```

3. Файл `.env.local` уже настроен для локальной разработки. Убедитесь, что он содержит все необходимые переменные.

4. Запустить в режиме разработки:
   ```
   # Запустить клиент и сервер одновременно
   npm run start:dev
   
   # Или запустить отдельно
   npm run dev        # Только клиент
   npm run server:dev # Только сервер
   ```

### Запуск с Docker

```
docker-compose up -d
```

После запуска контейнеров будут доступны следующие сервисы:

- Supabase Studio: http://localhost:3100
- Клиент: http://localhost:3000
- API: http://localhost:8000
- Storage API: http://localhost:5000

## Доступные скрипты

### Разработка
- `npm run dev` - запуск клиента в режиме разработки
- `npm run server:dev` - запуск сервера в режиме разработки
- `npm run start:dev` - одновременный запуск клиента и сервера в режиме разработки

### Сборка и продакшн
- `npm run build` - сборка клиента для продакшн
- `npm run build:dev` - сборка клиента для разработки
- `npm run server:prod` - запуск сервера в продакшн режиме
- `npm run start:prod` - запуск продакшн сервера
- `npm run preview` - предпросмотр собранного клиента

### Тестирование и качество кода
- `npm test` - запуск тестов
- `npm run test:watch` - запуск тестов в режиме наблюдения
- `npm run test:coverage` - запуск тестов с отчетом о покрытии
- `npm run lint` - проверка кода линтером
- `npm run lint:fix` - исправление ошибок линтера
- `npm run format` - форматирование кода

### Утилиты
- `npm run prepare-env` - создание .env файла из .env.example

## Сборка для разных окружений

### Development

```
npm run build:dev
```

### Production

```
npm run build
```

## Конфигурация окружений

Проект использует два основных файла конфигурации:

### .env.local

Используется для **локальной разработки**. Этот файл не должен быть закоммичен в репозиторий и содержит настройки для локальной среды разработки, включая тестовые секретные данные.

### .env.example

Шаблон для создания `.env` файла для **production** среды. Содержит только несекретные настройки. При деплое через CI/CD:
1. Создается `.env` файл на основе `.env.example`
2. Секретные данные добавляются из GitHub Secrets
3. Полученный файл используется для запуска приложения

### Основные переменные окружения для Supabase

```env
# JWT и безопасность
JWT_SECRET=your-super-secret-jwt-token
SUPABASE_JWT_SECRET=your-super-secret-jwt-token

# Порты
POSTGRES_PORT=5432
AUTH_PORT=9999
STORAGE_PORT=5000
STUDIO_PORT=3100

# База данных
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres
DB_USER=postgres
DB_PASSWORD=postgres

# Supabase
SUPABASE_URL=http://localhost:8000
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Storage settings
STORAGE_BACKEND=file
STORAGE_FILE_BACKEND_PATH=./storage
DATABASE_URL=postgres://postgres:postgres@supabase-db:5432/postgres

# Upload settings
UPLOAD_FILE_SIZE_LIMIT=524288000
UPLOAD_FILE_SIZE_LIMIT_STANDARD=52428800
UPLOAD_SIGNED_URL_EXPIRATION_TIME=120
```

## Supabase

### Доступ к Supabase Studio

1. Откройте http://localhost:3100
2. Используйте учетные данные:
   - Email: указанный в DASHBOARD_USERNAME
   - Пароль: указанный в DASHBOARD_PASSWORD

### Структура базы данных

Проект использует следующие основные таблицы:

1. `auth.users` - пользователи системы
2. `public.profiles` - профили пользователей

### Хранилище файлов

Проект использует локальное файловое хранилище вместо S3:
- Путь к файлам: `./storage`
- Максимальный размер файла: 500MB (настраивается в UPLOAD_FILE_SIZE_LIMIT)
- URL для доступа к файлам: http://localhost:5000

## CI/CD

Проект использует GitHub Actions для автоматического развертывания:

- Пуш в ветку `develop` -> деплой в окружение Development
- Пуш в ветку `main` -> деплой в окружение Production

## Безопасность и секреты

### Локальная разработка

Для локальной разработки используется файл `.env.local`, который содержит тестовые секретные данные. **Никогда не коммитьте этот файл в репозиторий!**

### CI/CD и деплой

Для CI/CD используются секреты, хранящиеся в GitHub Secrets:

1. **Для Production:**
   - `JWT_SECRET`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `DASHBOARD_USERNAME`
   - `DASHBOARD_PASSWORD`
   - `DEPLOY_KEY` (SSH-ключ для деплоя)

2. **Для Development:**
   - `JWT_SECRET_DEV`
   - `PB_ADMIN_EMAIL_DEV`
   - `PB_ADMIN_PASSWORD_DEV`

Эти секреты добавляются в `.env` файл во время CI/CD процесса и никогда не хранятся в репозитории.

## Тестирование

```
# Запуск всех тестов
npm test

# Запуск тестов в режиме наблюдения
npm run test:watch

# Запуск тестов с отчетом о покрытии
npm run test:coverage
```

## Линтинг и форматирование

```
# Проверка кода линтером
npm run lint

# Исправление ошибок линтера
npm run lint:fix

# Форматирование кода
npm run format
```

## Руководство по разработке и тестированию

### Обзор стека технологий

Проект использует следующие технологии:

1. **Клиентская часть**:
   - React для пользовательского интерфейса
   - Phaser.js для игровой механики
   - Vite для сборки и разработки

2. **Серверная часть**:
   - Node.js как основа
   - Colyseus для многопользовательской синхронизации
   - Winston для логирования

3. **Инфраструктура**:
   - Redis для кэширования и обмена сообщениями
   - NATS для асинхронной коммуникации
   - Supabase для хранения данных и аутентификации
   - Prometheus и Grafana для мониторинга
   - Loki для централизованного логирования
   - Nginx как прокси-сервер

### Варианты запуска для разработки

#### 1. Локальная разработка (рекомендуется для начала)

Этот вариант запускает только клиент и сервер без дополнительных сервисов:

```bash
npm run start:dev
```

Это запустит:
- Клиент на порту 3000 (или 3001, если 3000 занят)
- Сервер на порту 2567

Преимущества:
- Быстрый запуск
- Меньше ресурсов
- Удобно для разработки клиентской части и базовой логики сервера

#### 2. Полный стек через Docker Compose

Этот вариант запускает все сервисы, включая Redis, NATS, Supabase и т.д.:

```bash
docker-compose up -d
```

Затем вы можете запустить клиент отдельно:

```bash
npm run dev
```

Преимущества:
- Полная среда, идентичная продакшену
- Доступны все сервисы для тестирования
- Можно тестировать мониторинг и логирование

### Пошаговое руководство по началу разработки

#### Шаг 1: Подготовка окружения

1. Убедитесь, что у вас установлены все требования (Node.js, Docker, Git)
2. Проверьте наличие файла `.env.local` с настройками для разработки

#### Шаг 2: Запуск в режиме разработки

```bash
npm run start:dev
```

Это запустит клиент и сервер одновременно. Вы увидите:
- Клиент доступен по адресу http://localhost:3000/
- Сервер запущен на порту 2567

#### Шаг 3: Изучение структуры проекта

- `src/` - клиентская часть (React + Phaser)
  - `src/components/` - React компоненты
  - `src/game/` - Phaser игра
  - `src/utils/` - утилиты

- `server/` - серверная часть
  - `server/index.js` - основной файл сервера
  - `server/config.js` - конфигурация
  - `server/logger.js` - настройки логирования

#### Шаг 4: Тестирование полного стека

1. Остановите локальную разработку (Ctrl+C)
2. Запустите полный стек:
   ```bash
   docker-compose up -d
   ```
3. Проверьте доступность сервисов:
   - Supabase Studio: http://localhost:3100/
   - Grafana: http://localhost:3000/
   - Prometheus: http://localhost:9090/
   - Loki: http://localhost:3101/
   - Redis: порт 6379
   - NATS: порт 4222

4. Запустите клиент отдельно:
   ```bash
   npm run dev
   ```
### Доступ к инструментам мониторинга и управления

При запуске через Docker Compose:

1. **Supabase Studio** (управление базой данных):
   - URL: http://localhost:3100/
   - Логин: указанный в DASHBOARD_USERNAME
   - Пароль: указанный в DASHBOARD_PASSWORD

2. **Grafana** (мониторинг):
   - URL: http://localhost:3000/
   - Логин: admin
   - Пароль: admin (по умолчанию)

3. **Prometheus** (метрики):
   - URL: http://localhost:9090/

### Решение проблем

1. **Порты уже заняты**:
   - Остановите все контейнеры: `docker-compose down`
   - Проверьте запущенные процессы: `docker ps`

2. **Ошибки подключения к сервисам**:
   - Проверьте, запущены ли все контейнеры: `docker-compose ps`
   - Проверьте логи: `docker-compose logs [service-name]`

3. **Проблемы с Docker**:
   - Перезапустите Docker Desktop
   - Очистите неиспользуемые ресурсы: `docker system prune`

4. **Проблемы с хранилищем файлов**:
   - Убедитесь, что директория `storage/` существует и имеет правильные права доступа
   - Проверьте логи сервиса хранилища: `docker-compose logs storage`
   - Проверьте настройки переменных окружения для хранилища

5. **Ошибки подключения к Supabase**:
   - Проверьте статус контейнеров: `docker-compose ps`
   - Проверьте логи: `docker-compose logs supabase-db supabase-auth`
   - Убедитесь, что все переменные окружения установлены правильно
   - Проверьте, что скрипты инициализации в `volumes/db/` выполнились корректно
   
## Рекомендации по улучшению проекта

### 1. Безопасность

- **Удалите учетные данные из кода**: В файлах `.env` и `init_admin.sql` содержатся реальные учетные данные. Замените их на плейсхолдеры и используйте секреты для CI/CD.
- **Обновите CI/CD**: Файл `deploy.yml` содержит устаревшие ссылки на PocketBase. Обновите его для работы с Supabase.
- **Используйте HTTPS**: Настройте SSL/TLS для всех сервисов в продакшн окружении.

### 2. Архитектура

- **Разделите монолит**: Рассмотрите возможность разделения игрового сервера и API на отдельные сервисы.
- **Используйте TypeScript**: Постепенно переводите JavaScript код на TypeScript для лучшей типизации и предотвращения ошибок.
- **Внедрите микросервисную архитектуру**: Для масштабирования отдельных компонентов системы.

### 3. Производительность

- **Оптимизируйте Docker образы**: Используйте многоэтапные сборки для уменьшения размера образов.
- **Настройте кэширование**: Добавьте Redis для кэширования часто запрашиваемых данных.
- **Оптимизируйте запросы к БД**: Добавьте индексы для часто используемых запросов.

### 4. Разработка

- **Улучшите документацию**: Добавьте документацию по API и игровым механикам.
- **Расширьте тесты**: Увеличьте покрытие кода тестами, добавьте интеграционные и e2e тесты.
- **Внедрите Storybook**: Для документации и тестирования UI компонентов.
- **Настройте линтеры и форматтеры**: Добавьте pre-commit хуки для автоматической проверки кода.

### 5. Мониторинг и логирование

- **Настройте алерты**: Добавьте оповещения о критических ошибках и проблемах производительности.
- **Улучшите логирование**: Структурируйте логи и добавьте контекст для лучшего анализа.
- **Внедрите трассировку**: Добавьте распределенную трассировку для отслеживания запросов через разные сервисы.

### 6. Инфраструктура

- **Используйте Kubernetes**: Для более гибкого управления контейнерами в продакшн.
- **Настройте автомасштабирование**: Для автоматического увеличения ресурсов при высокой нагрузке.
- **Внедрите инфраструктуру как код**: Используйте Terraform или Pulumi для управления инфраструктурой.

## Лицензия

MIT

## Проверка работоспособности сервисов

### 1. Проверка статуса контейнеров

```bash
# Проверить статус всех контейнеров
docker-compose ps

# Должны быть запущены (Status: Up) следующие сервисы:
# - supabase-db
# - supabase-auth
# - supabase-studio
# - supabase-rest
# - supabase-realtime
# - storage
# - redis
# - nats
# - prometheus
# - grafana
# - loki
# - nginx
```

### 2. Проверка доступности сервисов

1. **Клиентское приложение**:
   ```bash
   # Проверьте доступность клиента
   curl http://localhost:3000
   # Или откройте в браузере: http://localhost:3000
   ```

2. **Supabase Studio**:
   ```bash
   # Проверьте доступность Supabase Studio
   curl http://localhost:3100
   # Или откройте в браузере: http://localhost:3100
   ```

3. **API и Auth**:
   ```bash
   # Проверьте здоровье Auth сервиса
   curl http://localhost:9999/health
   
   # Проверьте API
   curl http://localhost:8000/rest/v1/
   ```

4. **Storage API**:
   ```bash
   # Проверьте Storage API
   curl http://localhost:5000/health
   ```

5. **Мониторинг**:
   ```bash
   # Проверьте Prometheus
   curl http://localhost:9090/-/healthy
   
   # Проверьте Grafana
   curl http://localhost:3000/api/health
   
   # Проверьте Loki
   curl http://localhost:3101/ready
   ```

### 3. Проверка логов

```bash
# Проверка логов конкретного сервиса
docker-compose logs [service-name]

# Например, для Supabase DB:
docker-compose logs supabase-db

# Для Auth:
docker-compose logs supabase-auth

# Для Storage:
docker-compose logs storage
```

### 4. Проверка базы данных

```bash
# Подключение к базе данных
docker-compose exec supabase-db psql -U postgres

# Проверка таблиц auth схемы
\c postgres
\dt auth.*

# Проверка таблиц public схемы
\dt public.*

# Проверка расширений
\dx
```

### 5. Проверка Redis и NATS

```bash
# Проверка Redis
docker-compose exec redis redis-cli ping
# Должен ответить: PONG

# Проверка NATS
docker-compose exec nats nats-server --version
```

### 6. Проверка файлового хранилища

```bash
# Проверка директории storage
ls -la storage/

# Проверка прав доступа
docker-compose exec storage ls -la /storage
```

### 7. Проверка игрового сервера

```bash
# Проверка WebSocket сервера
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Host: localhost:2567" \
  -H "Origin: http://localhost:3000" \
  http://localhost:2567
```

### Устранение типичных проблем

1. **Если какой-то контейнер не запустился**:
   ```bash
   # Просмотр детальных логов
   docker-compose logs --tail=100 [service-name]
   
   # Перезапуск проблемного сервиса
   docker-compose restart [service-name]
   ```

2. **Если база данных недоступна**:
   ```bash
   # Проверка инициализации БД
   docker-compose logs supabase-db | grep "database system is ready"
   
   # Проверка выполнения миграций
   docker-compose logs supabase-db | grep "init_admin.sql"
   ```

3. **Если не работает хранилище файлов**:
   ```bash
   # Проверка прав доступа
   sudo chown -R 1000:1000 storage/
   
   # Пересоздание директории
   rm -rf storage/ && mkdir storage && chmod 777 storage
   ```

4. **Если не работает аутентификация**:
   ```bash
   # Проверка переменных окружения
   docker-compose config | grep -A 10 supabase-auth
   
   # Проверка подключения к БД
   docker-compose exec supabase-auth curl http://supabase-db:5432
   ```

### Полезные команды для отладки

```bash
# Просмотр всех переменных окружения контейнера
docker-compose exec [service-name] env

# Просмотр использования ресурсов
docker stats

# Проверка сетевых соединений
docker network inspect gamest_default

# Очистка и перезапуск всего окружения
docker-compose down -v
docker system prune -f
docker-compose up -d
```
