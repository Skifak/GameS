# Переменные
GIT = git
MSG ?= "Update"  # Сообщение коммита по умолчанию

# Справка
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make commit   - Stage and commit all changes"
	@echo "  make push     - Push changes to origin main"

# Добавление и коммит изменений
.PHONY: commit
commit:
	$(GIT) add .
	$(GIT) commit -m "$(MSG)"

# Пуш изменений
.PHONY: push
push:
	$(GIT) push origin main