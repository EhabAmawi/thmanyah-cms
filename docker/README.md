# Docker Setup for Thmanyah CMS

This directory contains all Docker-related configuration files for the Thmanyah CMS application.

## 📁 Directory Structure

```
docker/
├── Dockerfile              # Multi-stage production Dockerfile
├── Dockerfile.dev          # Development Dockerfile with hot reload
├── nginx/                  # Nginx reverse proxy configuration
│   ├── nginx.conf          # Main Nginx configuration
│   └── conf.d/            
│       └── default.conf    # Site configuration with caching & rate limiting
├── postgres/              
│   └── init.sql           # PostgreSQL initialization & performance tuning
└── README.md              # This file
```

## 🚀 Quick Start

### Using the Makefile (Recommended)

The project includes a comprehensive Makefile that simplifies all Docker operations:

```bash
# Show all available commands
make help

# Quick start for development
make quick-start

# Start development environment
make dev

# Start production environment
make prod

# View logs
make dev-logs
make prod-logs
```

### Manual Docker Commands

#### Development Environment

```bash
# Start development stack
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop containers
docker-compose -f docker-compose.dev.yml stop

# Remove containers and volumes
docker-compose -f docker-compose.dev.yml down -v
```

#### Production Environment

```bash
# Build production image
docker-compose build

# Start production stack
docker-compose up -d

# Start with Nginx reverse proxy
docker-compose --profile with-nginx up -d
```

## 🛠️ Configuration

### Environment Files

The project uses different environment files for different environments:

- `.env.example` - Template with all available variables
- `.env.development` - Development configuration
- `.env.production` - Production configuration
- `.env` - Active configuration file

### Key Services

#### PostgreSQL Database
- **Development**: Port 5433, user: `thmanyah_dev`, password: `dev_secret`
- **Production**: Port 5432, user: `thmanyah`, password: (set in .env)
- Includes performance tuning and full-text search extensions

#### Redis Cache
- **Development**: Port 6380, no password
- **Production**: Port 6379, password protected
- Used for API response caching and session storage

#### NestJS Application
- **Development**: Port 3000 with hot reload, debug port 9229
- **Production**: Port 3000, optimized multi-stage build
- Health check endpoint at `/health`

#### Nginx (Optional)
- Load balancing with least connections
- Rate limiting for API endpoints
- Response caching for discovery endpoints
- Static file serving for uploads
- SSL/TLS ready configuration

## 📋 Common Tasks

### Database Operations

```bash
# Run migrations
make db-migrate        # Development
make db-migrate-prod   # Production

# Open Prisma Studio
make db-studio

# Backup database
make db-backup        # Production
make db-backup-dev    # Development

# Reset database (development only)
make db-reset
```

### Container Management

```bash
# Open shell in container
make shell            # Development app
make shell-prod       # Production app
make shell-db         # PostgreSQL
make shell-redis      # Redis

# View container stats
make stats

# Check service health
make health
```

### Testing & Development

```bash
# Run tests
make test
make test-e2e

# Run linter
make lint

# Format code
make format

# Start development tools (Adminer)
make tools
```

## 🏗️ Architecture

### Multi-Stage Build (Production)

The production Dockerfile uses a multi-stage build process:

1. **deps**: Install and cache dependencies
2. **builder**: Build the TypeScript application
3. **runner**: Minimal runtime image with only necessary files

Benefits:
- Smaller final image size (~200MB vs ~1GB)
- Better security (no build tools in production)
- Faster deployment and scaling

### Development Setup

The development setup includes:
- Volume mounting for hot reload
- Separate database and Redis instances
- Prisma Studio for database management
- Node debugger on port 9229
- Adminer for database GUI (optional)

### Production Setup

The production setup features:
- Optimized multi-stage Docker builds
- Health checks for all services
- Automatic database migrations
- Optional Nginx reverse proxy
- Security hardening (non-root user, minimal attack surface)

## 🔒 Security Considerations

### Production Checklist

- [ ] Change all default passwords in `.env.production`
- [ ] Use strong, unique passwords for PostgreSQL and Redis
- [ ] Generate secure JWT secrets (use `openssl rand -base64 32`)
- [ ] Enable SSL/TLS in Nginx configuration
- [ ] Restrict database access to application network only
- [ ] Enable Redis password authentication
- [ ] Use secrets management system for sensitive data
- [ ] Regular security updates for base images

### Network Isolation

All services run in isolated Docker networks:
- `thmanyah-network` (production)
- `thmanyah-dev-network` (development)

Only exposed ports are accessible from the host.

## 🚦 Health Checks

All services include health checks:

- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping`
- **NestJS**: HTTP GET `/health`
- **Nginx**: TCP port check

## 📊 Performance Optimization

### PostgreSQL Tuning

The `init.sql` script includes performance optimizations:
- Shared buffers: 256MB
- Effective cache size: 1GB
- Full-text search indexes
- Query performance logging

### Redis Caching

Configured cache TTLs:
- Discovery search: 5 minutes
- Discovery browse: 5 minutes
- Program details: 10 minutes
- Categories list: 30 minutes

### Nginx Caching

- Static file caching: 30 days
- API response caching for discovery endpoints
- Gzip compression for text content

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000

# Use different ports in .env
APP_PORT=3001
POSTGRES_PORT=5433
REDIS_PORT=6380
```

#### Permission Denied
```bash
# Fix file permissions
chmod +x docker/*.sh
chown -R $(id -u):$(id -g) .
```

#### Database Connection Failed
```bash
# Check database is running
make health

# View database logs
docker logs thmanyah-postgres-dev

# Test connection
make shell-db
```

#### Out of Memory
```bash
# Increase Docker memory limit
# Docker Desktop: Preferences > Resources > Memory

# Or use swap
sudo sysctl vm.swappiness=60
```

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [Nginx Docker Image](https://hub.docker.com/_/nginx)

## 📝 Notes

- Development data is persisted in Docker volumes
- Use `make dev-clean` to completely reset development environment
- Production builds are optimized for size and performance
- All sensitive configuration should be in environment files, not committed to git
- Regular backups are recommended for production databases