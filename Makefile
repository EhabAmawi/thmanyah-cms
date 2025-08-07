# Makefile for Thmanyah CMS Docker Operations

# Variables
DOCKER_COMPOSE = docker-compose
DOCKER_COMPOSE_DEV = docker-compose -f docker-compose.dev.yml
DOCKER_COMPOSE_PROD = docker-compose -f docker-compose.yml
APP_NAME = thmanyah-cms
CONTAINER_APP = thmanyah-app
CONTAINER_APP_DEV = thmanyah-app-dev
CONTAINER_DB = thmanyah-postgres
CONTAINER_DB_DEV = thmanyah-postgres-dev
CONTAINER_REDIS = thmanyah-redis
CONTAINER_REDIS_DEV = thmanyah-redis-dev

# Colors for terminal output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

.PHONY: help
help: ## Show this help message
	@echo "${GREEN}Thmanyah CMS Docker Commands${NC}"
	@echo ""
	@echo "Usage: make [command]"
	@echo ""
	@echo "${YELLOW}Available commands:${NC}"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${GREEN}%-20s${NC} %s\n", $$1, $$2}'

# ============= Development Commands =============

.PHONY: dev
dev: ## Start development environment (PostgreSQL + Redis + App with hot reload)
	@echo "${GREEN}Starting development environment...${NC}"
	$(DOCKER_COMPOSE_DEV) up -d
	@echo "${GREEN}Development environment is running!${NC}"
	@echo "App: http://localhost:3000"
	@echo "PostgreSQL: localhost:5433"
	@echo "Redis: localhost:6380"

.PHONY: dev-logs
dev-logs: ## Show development container logs
	$(DOCKER_COMPOSE_DEV) logs -f

.PHONY: dev-stop
dev-stop: ## Stop development environment
	@echo "${YELLOW}Stopping development environment...${NC}"
	$(DOCKER_COMPOSE_DEV) stop

.PHONY: dev-down
dev-down: ## Stop and remove development containers
	@echo "${RED}Removing development containers...${NC}"
	$(DOCKER_COMPOSE_DEV) down

.PHONY: dev-clean
dev-clean: ## Remove development containers and volumes (WARNING: Deletes data)
	@echo "${RED}WARNING: This will delete all development data!${NC}"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DOCKER_COMPOSE_DEV) down -v

.PHONY: dev-rebuild
dev-rebuild: ## Rebuild development containers
	@echo "${GREEN}Rebuilding development containers...${NC}"
	$(DOCKER_COMPOSE_DEV) build --no-cache

.PHONY: dev-restart
dev-restart: dev-stop dev ## Restart development environment

# ============= Production Commands =============

.PHONY: prod
prod: ## Start production environment
	@echo "${GREEN}Starting production environment...${NC}"
	$(DOCKER_COMPOSE_PROD) up -d
	@echo "${GREEN}Production environment is running!${NC}"
	@echo "App: http://localhost:3000"

.PHONY: prod-build
prod-build: ## Build production Docker image
	@echo "${GREEN}Building production image...${NC}"
	$(DOCKER_COMPOSE_PROD) build --no-cache

.PHONY: prod-logs
prod-logs: ## Show production container logs
	$(DOCKER_COMPOSE_PROD) logs -f

.PHONY: prod-stop
prod-stop: ## Stop production environment
	@echo "${YELLOW}Stopping production environment...${NC}"
	$(DOCKER_COMPOSE_PROD) stop

.PHONY: prod-down
prod-down: ## Stop and remove production containers
	@echo "${RED}Removing production containers...${NC}"
	$(DOCKER_COMPOSE_PROD) down

.PHONY: prod-with-nginx
prod-with-nginx: ## Start production with Nginx reverse proxy
	@echo "${GREEN}Starting production with Nginx...${NC}"
	$(DOCKER_COMPOSE_PROD) --profile with-nginx up -d
	@echo "${GREEN}Production with Nginx is running!${NC}"
	@echo "Nginx: http://localhost:80"

# ============= Database Commands =============

.PHONY: db-migrate
db-migrate: ## Run database migrations (development)
	@echo "${GREEN}Running database migrations...${NC}"
	docker exec $(CONTAINER_APP_DEV) npx prisma migrate dev

.PHONY: db-migrate-prod
db-migrate-prod: ## Run database migrations (production)
	@echo "${GREEN}Running production database migrations...${NC}"
	docker exec $(CONTAINER_APP) npx prisma migrate deploy

.PHONY: db-seed
db-seed: ## Seed the database (development)
	@echo "${GREEN}Seeding database...${NC}"
	docker exec $(CONTAINER_APP_DEV) npx prisma db seed

.PHONY: db-reset
db-reset: ## Reset database (development only)
	@echo "${RED}WARNING: This will reset the database!${NC}"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker exec $(CONTAINER_APP_DEV) npx prisma migrate reset

.PHONY: db-studio
db-studio: ## Open Prisma Studio (development)
	@echo "${GREEN}Opening Prisma Studio...${NC}"
	$(DOCKER_COMPOSE_DEV) --profile studio up -d prisma-studio
	@echo "Prisma Studio: http://localhost:5555"

.PHONY: db-backup
db-backup: ## Backup production database
	@echo "${GREEN}Backing up production database...${NC}"
	@mkdir -p backups
	docker exec $(CONTAINER_DB) pg_dump -U thmanyah thmanyah_cms | gzip > backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "${GREEN}Backup saved to backups/backup_$$(date +%Y%m%d_%H%M%S).sql.gz${NC}"

.PHONY: db-backup-dev
db-backup-dev: ## Backup development database
	@echo "${GREEN}Backing up development database...${NC}"
	@mkdir -p backups
	docker exec $(CONTAINER_DB_DEV) pg_dump -U thmanyah_dev thmanyah_cms_dev | gzip > backups/backup_dev_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "${GREEN}Backup saved to backups/backup_dev_$$(date +%Y%m%d_%H%M%S).sql.gz${NC}"

# ============= Utility Commands =============

.PHONY: shell
shell: ## Open shell in development app container
	docker exec -it $(CONTAINER_APP_DEV) /bin/sh

.PHONY: shell-prod
shell-prod: ## Open shell in production app container
	docker exec -it $(CONTAINER_APP) /bin/sh

.PHONY: shell-db
shell-db: ## Open PostgreSQL shell (development)
	docker exec -it $(CONTAINER_DB_DEV) psql -U thmanyah_dev thmanyah_cms_dev

.PHONY: shell-redis
shell-redis: ## Open Redis CLI (development)
	docker exec -it $(CONTAINER_REDIS_DEV) redis-cli

.PHONY: test
test: ## Run tests in development container
	@echo "${GREEN}Running tests...${NC}"
	docker exec $(CONTAINER_APP_DEV) yarn test

.PHONY: test-e2e
test-e2e: ## Run e2e tests in development container
	@echo "${GREEN}Running e2e tests...${NC}"
	docker exec $(CONTAINER_APP_DEV) yarn test:e2e

.PHONY: lint
lint: ## Run linter in development container
	@echo "${GREEN}Running linter...${NC}"
	docker exec $(CONTAINER_APP_DEV) yarn lint

.PHONY: format
format: ## Run formatter in development container
	@echo "${GREEN}Running formatter...${NC}"
	docker exec $(CONTAINER_APP_DEV) yarn format

.PHONY: logs
logs: ## Show all container logs (development)
	$(DOCKER_COMPOSE_DEV) logs -f

.PHONY: ps
ps: ## Show running containers
	@echo "${GREEN}Development containers:${NC}"
	$(DOCKER_COMPOSE_DEV) ps
	@echo ""
	@echo "${GREEN}Production containers:${NC}"
	$(DOCKER_COMPOSE_PROD) ps

.PHONY: clean
clean: ## Clean all Docker resources (containers, images, volumes)
	@echo "${RED}WARNING: This will remove all Docker resources for this project!${NC}"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(DOCKER_COMPOSE_DEV) down -v --rmi all
	$(DOCKER_COMPOSE_PROD) down -v --rmi all
	docker system prune -f

.PHONY: tools
tools: ## Start development tools (Adminer database GUI)
	@echo "${GREEN}Starting development tools...${NC}"
	$(DOCKER_COMPOSE_DEV) --profile tools up -d
	@echo "Adminer: http://localhost:8080"

# ============= Quick Setup Commands =============

.PHONY: setup
setup: ## Initial setup for development
	@echo "${GREEN}Setting up development environment...${NC}"
	@cp -n .env.example .env.development || true
	@cp -n .env.example .env || true
	@echo "${YELLOW}Please update .env.development with your configuration${NC}"
	@echo "${GREEN}Run 'make dev' to start development environment${NC}"

.PHONY: setup-prod
setup-prod: ## Initial setup for production
	@echo "${GREEN}Setting up production environment...${NC}"
	@cp -n .env.production .env || true
	@echo "${RED}IMPORTANT: Update .env with secure production values!${NC}"
	@echo "${GREEN}Run 'make prod-build' then 'make prod' to start${NC}"

.PHONY: quick-start
quick-start: setup dev ## Quick start for development (setup + start)
	@echo "${GREEN}Development environment is ready!${NC}"
	@echo "App: http://localhost:3000"
	@echo "API Docs: http://localhost:3000/api"

# ============= Monitoring Commands =============

.PHONY: stats
stats: ## Show container resource usage
	docker stats --no-stream $(CONTAINER_APP_DEV) $(CONTAINER_DB_DEV) $(CONTAINER_REDIS_DEV)

.PHONY: health
health: ## Check health status of all services
	@echo "${GREEN}Checking service health...${NC}"
	@docker exec $(CONTAINER_DB_DEV) pg_isready -U thmanyah_dev && echo "✓ PostgreSQL is healthy" || echo "✗ PostgreSQL is not healthy"
	@docker exec $(CONTAINER_REDIS_DEV) redis-cli ping > /dev/null 2>&1 && echo "✓ Redis is healthy" || echo "✗ Redis is not healthy"
	@curl -s http://localhost:3000/health > /dev/null 2>&1 && echo "✓ App is healthy" || echo "✗ App is not healthy"

# Default target
.DEFAULT_GOAL := help