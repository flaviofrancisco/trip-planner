.PHONY: clean build up down restart logs ps rebuild

# Strip macOS AppleDouble companions that the FAT-formatted SSD generates
# on every file write. BuildKit's context loader xattrs every file before
# applying .dockerignore, so these have to go before any build.
clean:
	@find . -name '._*' -type f -delete 2>/dev/null || true
	@find . -name '.DS_Store' -type f -delete 2>/dev/null || true

build: clean
	docker compose build

up: clean
	docker compose up -d

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

rebuild: clean
	docker compose up -d --build
