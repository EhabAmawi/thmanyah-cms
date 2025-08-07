# Docker Deployment

## Overview

The Thmanyah CMS uses Docker for containerization with multi-stage builds, optimized images, and orchestration support for both development and production environments.

## Docker Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Host                       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │    Nginx    │  │   NestJS    │  │   NestJS    │ │
│  │   (Proxy)   │──│    App 1    │  │    App 2    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │                │                 │        │
│  ┌──────┴────────────────┴─────────────────┴─────┐ │
│  │              Docker Network                    │ │
│  └────────┬──────────────┬────────────────┬──────┘ │
│  ┌────────▼────────┐  ┌──▼──────────┐  ┌─▼──────┐ │
│  │   PostgreSQL    │  │    Redis    │  │ Adminer│ │
│  │    (Primary)    │  │   (Cache)   │  │  (GUI) │ │
│  └─────────────────┘  └─────────────┘  └────────┘ │
└─────────────────────────────────────────────────────┘
```

## Multi-Stage Dockerfile

### Production Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache postgresql-client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Image Optimization

- **Base Image**: Alpine Linux (5MB base)
- **Final Size**: ~150MB
- **Build Cache**: Leverages Docker layer caching
- **Security**: Non-root user execution

## Docker Compose Configuration

### Development Environment

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: thmanyah_cms
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/thmanyah_cms
      REDIS_HOST: redis
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: yarn start:dev

volumes:
  postgres_data:
  redis_data:
```

### Production Environment

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/conf.d:/etc/nginx/conf.d
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '0.5'
          memory: 128M

  api:
    image: thmanyah-cms:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_HOST: redis
      JWT_SECRET: ${JWT_SECRET}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    deploy:
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          cpus: '2'
          memory: 2G

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

## Container Orchestration

### Docker Swarm Deployment

```bash
# Initialize swarm
docker swarm init --advertise-addr 10.0.0.1

# Deploy stack
docker stack deploy -c docker-compose.prod.yml thmanyah

# Scale services
docker service scale thmanyah_api=5

# Update service
docker service update --image thmanyah-cms:v2 thmanyah_api

# Monitor services
docker service ls
docker service ps thmanyah_api
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thmanyah-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: thmanyah-api
  template:
    metadata:
      labels:
        app: thmanyah-api
    spec:
      containers:
      - name: api
        image: thmanyah-cms:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: thmanyah-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: thmanyah-api-service
spec:
  selector:
    app: thmanyah-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Makefile Commands

```makefile
# Development
make dev           # Start development environment
make dev-logs      # View development logs
make dev-shell     # Shell into API container
make dev-down      # Stop development environment

# Production
make prod          # Build and start production
make prod-build    # Build production images
make prod-up       # Start production services
make prod-down     # Stop production services

# Database
make db-migrate    # Run database migrations
make db-seed       # Seed database
make db-reset      # Reset database
make db-backup     # Backup database

# Testing
make test          # Run tests in container
make test-e2e      # Run E2E tests
make test-cov      # Generate coverage report

# Utilities
make clean         # Clean containers and volumes
make logs          # View all logs
make ps            # List running containers
make stats         # Show container statistics
```

## Container Best Practices

### Security

1. **Non-root User**
```dockerfile
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
USER nestjs
```

2. **Minimal Base Images**
```dockerfile
FROM node:18-alpine  # 5MB base vs 900MB for node:18
```

3. **Security Scanning**
```bash
docker scan thmanyah-cms:latest
```

### Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

## Environment Configuration

### Development Variables

```env
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/thmanyah_cms
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=development-secret-key
```

### Production Variables

```env
# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db.example.com:5432/thmanyah_cms
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure-redis-password
JWT_SECRET=production-secret-key-min-32-chars
```

## Monitoring

### Container Metrics

```bash
# Real-time statistics
docker stats

# Container logs
docker logs -f thmanyah_api_1

# Health status
docker inspect thmanyah_api_1 --format='{{.State.Health.Status}}'
```

### Prometheus Integration

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Build Docker image
      run: docker build -t thmanyah-cms:${{ github.sha }} .
    
    - name: Push to Registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push thmanyah-cms:${{ github.sha }}
```

### GitLab CI

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - docker stack deploy -c docker-compose.prod.yml thmanyah
  only:
    - main
```

## Production Deployment Best Practices

### Security Hardening
- Non-root user execution in containers
- Minimal base images (Alpine Linux)
- Regular security scanning with `docker scan`
- Secret management via environment variables

### Performance Optimization
- Multi-stage builds for smaller images (~150MB)
- Layer caching for faster builds
- Resource limits and reservations
- Health checks for container orchestration

### High Availability
- Multiple replicas with load balancing
- Rolling updates with zero downtime
- Persistent volumes for data durability
- Automated container recovery

## Related Documentation

- [Configuration](./CONFIGURATION.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Scalability](./SCALABILITY.md)
- [Security](./SECURITY.md)