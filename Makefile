# Установить зависимости: make install
# Сгенерировать документацию: make docs
# Сделать коммит: make commit MSG="Add new feature"
# Запушить изменения: make push ENV=stage
# Запустить приложение через Docker: make start
# Запустить фронтенд через Vite: make dev
# Запустить Supabase: make start:db
# Всё сразу: make all ENV=prod
# Очистить: make clean
# Посмотреть справку: make help

# Переменные
GIT = git                  # Команда для работы с git
MSG ?= "Update"            # Сообщение коммита по умолчанию, переопределяется через `make commit MSG="..."` 
NPM = npm                  # Команда для работы с npm
DOCS_DIR = docs            # Директория для сгенерированной документации
SRC_DIR = src              # Директория с исходным кодом
ENV ?= develop             # Среда по умолчанию (develop), переопределяется через `make ENV=stage|prod`

# Цель по умолчанию
.PHONY: all                # Объявляем all как "phony" (выполняется всегда)
all: docs build commit push  # Выполняет генерацию документации, сборку, коммит и пуш для текущей среды

# Справка
.PHONY: help               # Объявляем help как "phony"
help:                      # Выводит список доступных команд
	@echo "Available commands (use ENV=develop|stage|prod to specify environment):"
	@echo "  make all        - Сгенерировать документацию, собрать, сделать коммит и запушить изменения"
	@echo "  make docs       - Сгенерировать api.md и api.json"
	@echo "  make build      - Собрать приложение (использует ENV)"
	@echo "  make dev        - Запустить фронтенд в режиме разработки через Vite"
	@echo "  make start      - Запустить приложение через Docker (использует ENV)"
	@echo "  make start:db   - Запустить Supabase через Docker"
	@echo "  make stop       - Остановить контейнеры Docker"
	@echo "  make deploy     - Собрать и развернуть локально через Docker (использует ENV)"
	@echo "  make server     - Запустить сервер напрямую без Docker (использует ENV)"
	@echo "  make test       - Запустить тесты"
	@echo "  make lint       - Проверить код линтером"
	@echo "  make format     - Отформатировать код"
	@echo "  make commit     - Добавить и закоммитить все изменения"
	@echo "  make push       - Запушить изменения в ветку (использует ENV)"
	@echo "  make install    - Установить зависимости"
	@echo "  make clean      - Удалить сгенерированные файлы документации"
	@echo "  make versions   - Проверить версии сервисов в Docker"

# Генерация документации
.PHONY: docs               # Объявляем docs как "phony"
docs: $(DOCS_DIR)/api.md $(DOCS_DIR)/api.json  # Зависит от api.md и api.json

$(DOCS_DIR)/api.md: $(SRC_DIR)/*.js $(SRC_DIR)/*.jsx $(SRC_DIR)/*.ts  # Зависит от исходников + # Генерирует api.md через npm-скрипт
	$(NPM) run rag:md

$(DOCS_DIR)/api.json: $(DOCS_DIR)/api.md  # Зависит от api.md + # Генерирует api.json через npm-скрипт
	$(NPM) run rag:json

# Сборка приложения
.PHONY: build              # Объявляем build как "phony"
build:                     # Собирает приложение в зависимости от ENV
ifeq ($(ENV),develop)
	$(NPM) run build:dev
else ifeq ($(ENV),stage)
	$(NPM) run build:stage
else
	$(NPM) run build
endif

# Запуск фронтенда через Vite
.PHONY: dev                # Объявляем dev как "phony"
dev:                       # Запускает фронтенд через Vite для локальной разработки
	$(NPM) run dev

# Запуск Supabase через Docker
.PHONY: startdb           # Объявляем start:db как "phony"
startdb:                  # Запускает Supabase через отдельный docker-compose.yml
	$(NPM) run start:db

# Запуск приложения через Docker
.PHONY: start              # Объявляем start как "phony"
start:                     # Запускает приложение через Docker в зависимости от ENV
ifeq ($(ENV),prod)
	$(NPM) run start:prod
else ifeq ($(ENV),stage)
	$(NPM) run start:stage
else
	$(NPM) run start:dev
endif

# Остановка Docker-контейнеров
.PHONY: stop               # Объявляем stop как "phony"
stop:                      # Выполняет docker-compose down -v
	$(NPM) run stop

# Тестирование
.PHONY: test               # Объявляем test как "phony"
test:                      # Запускает тесты проекта
	$(NPM) run test

# Линтинг кода
.PHONY: lint               # Объявляем lint как "phony"
lint:                      # Проверяет код с помощью ESLint
	$(NPM) run lint

# Форматирование кода
.PHONY: format             # Объявляем format как "phony"
format:                    # Форматирует код с помощью Prettier
	$(NPM) run format

# Добавление и коммит изменений
.PHONY: commit             # Объявляем commit как "phony"
commit:                    # Добавляет и коммитит изменения
	$(GIT) add .
	-$(GIT) commit -m "$(MSG)"

# Пуш изменений
.PHONY: push               # Объявляем push как "phony"
push:                      # Пушит изменения в удалённый репозиторий
ifeq ($(ENV),prod)		   # Пушит в main для prod
	$(GIT) push origin main 
else  					   # Пушит в ветку, соответствующую ENV (develop или stage)
	$(GIT) push origin $(ENV)
endif

# Установка зависимостей
.PHONY: install            # Объявляем install как "phony"
install:                   # Устанавливает зависимости проекта
	$(NPM) install

# Очистка сгенерированных файлов
.PHONY: clean              # Объявляем clean как "phony"
clean:                     # Удаляет все .md и .json файлы в docs
	rm -rf $(DOCS_DIR)/*.md $(DOCS_DIR)/*.json

# Проверка версий сервисов
.PHONY: versions           # Объявляем versions как "phony"
versions:                  # Проверяет версии всех сервисов в Docker
	./check-versions.sh