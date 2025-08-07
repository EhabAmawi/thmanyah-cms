# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NestJS TypeScript CMS application called "thmanyah-cms". It follows standard NestJS architecture patterns with a modular structure using decorators, dependency injection, and the MVC pattern.

## Development Commands

The project uses Yarn as the package manager. Key commands:

```bash
# Install dependencies
yarn install

# Development server with hot reload
yarn run start:dev

# Production build
yarn run build

# Start production server
yarn run start:prod

# Linting and formatting
yarn run lint
yarn run format

# Testing
yarn run test           # Unit tests
yarn run test:watch     # Watch mode
yarn run test:cov       # Coverage report
yarn run test:e2e       # End-to-end tests

# Database (Prisma)
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run migrations in development
npx prisma migrate deploy # Run migrations in production
npx prisma db push      # Push schema to database (for prototyping)
npx prisma studio       # Open Prisma Studio (database GUI)
```

## Architecture

- **Framework**: NestJS with Express platform
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis caching for high-performance data access
- **Authentication**: JWT-based authentication with Passport.js
- **Rate Limiting**: Comprehensive rate limiting with @nestjs/throttler
- **Language**: TypeScript
- **Structure**: Standard NestJS modular architecture
  - `src/main.ts` - Application bootstrap (runs on port 3000 or PORT env var)
  - `src/app.module.ts` - Root application Module
  - `src/app.controller.ts` - Main controller
  - `src/app.service.ts` - Main service
  - `src/auth/` - Authentication module with JWT and local strategies
  - `src/employees/` - Employee management module
  - `src/categories/` - Category management module
  - `src/programs/` - Program management module
  - `src/import/` - Data import module for batch operations
  - `src/discovery/` - Public discovery module for searching programs
  - `src/cache/` - Redis caching module for performance optimization
  - `src/prisma/` - Prisma service and module for database integration
  - `src/config/` - Environment configuration module with validation
  - `src/common/` - Shared services, filters, guards, decorators, and interceptors
- **Testing**: Jest for unit tests, Supertest for e2e tests
- **Build**: NestJS CLI build system outputting to `dist/`

## Key Configuration Files

- `nest-cli.json` - NestJS CLI configuration
- `tsconfig.json` / `tsconfig.build.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration with Prettier integration
- `test/jest-e2e.json` - E2E test configuration
- `prisma/schema.prisma` - Prisma database schema
- `.env` - Environment variables (DATABASE_URL, JWT_SECRET, rate limiting settings)
- `.env.example` - Template with all required environment variables
- `src/config/` - Type-safe configuration module with validation

## Development Notes

- The project follows NestJS conventions with modules, controllers, and providers
- ESLint is configured with Prettier for code formatting
- Jest is configured to run tests from the `src` directory with `.spec.ts` pattern
- E2E tests are in the `test` directory
- Prisma is configured with PostgreSQL and integrated as a global module
- Authentication is required for all employee, category, and program endpoints (JWT Bearer token)
- Update DATABASE_URL and JWT_SECRET in `.env` before running the application
- All API endpoints are documented with Swagger at `/api`

## Features Implemented

### Authentication & Authorization System
- **JWT-based Authentication**: Secure token-based authentication using JSON Web Tokens
- **Access & Refresh Tokens**: Short-lived access tokens (15min) with long-lived refresh tokens (7 days)
- **Employee-based Authentication**: Uses existing Employee table for user management
- **Password Security**: bcrypt hashing with salt rounds for secure password storage
- **Passport.js Integration**: JWT and Local strategies for authentication
- **Protected Routes**: All employee endpoints require valid JWT Bearer token
- **Authentication Endpoints** (with `@PublicRateLimit()` - 100 requests/min per IP):
  - `POST /auth/login` - Login with email/password
  - `POST /auth/refresh` - Refresh access token using refresh token
  - `POST /auth/profile` - Get authenticated user profile (requires JWT + `@AuthenticatedRateLimit()`)

### Employees Module
- Complete CRUD operations with REST API endpoints
- JWT Authentication required for all endpoints
- Rate limiting with `@AuthenticatedRateLimit()` (1000 requests/min per user)
- Prisma database integration with PostgreSQL
- Password field included in employee model with automatic hashing
- Query filtering (active employees, by department)
- Password exclusion from all API responses for security
- Comprehensive test coverage (unit + integration + e2e tests)

### Categories Module
- Complete CRUD operations with REST API endpoints
- JWT Authentication required for all endpoints
- Rate limiting with `@AuthenticatedRateLimit()` (1000 requests/min per user)
- Prisma database integration with PostgreSQL
- Query filtering (active categories)
- Unique constraint on category names
- Comprehensive test coverage (unit + integration + e2e tests)
- **Category Endpoints**:
  - `POST /categories` - Create new category
  - `GET /categories` - Get all categories (with optional `?active=true` filter)
  - `GET /categories/:id` - Get category by ID
  - `PATCH /categories/:id` - Update category
  - `DELETE /categories/:id` - Delete category

### Programs Module
- Complete CRUD operations with REST API endpoints
- JWT Authentication required for all endpoints
- Rate limiting: `@AuthenticatedRateLimit()` for CRUD, `@SearchRateLimit()` for filtering (30 requests/min per IP)
- Program management with media content support
- Multi-language support (English/Arabic) with Language enum
- Media type support (Video/Audio) with MediaType enum
- Duration tracking in seconds with validation
- Release date management with proper date handling
- Media URL validation and storage
- **Pagination Support**: Offset-based pagination with configurable page size (default: 20, max: 100)
- Query filtering (by language, media type, status, category, recent programs)
- Enhanced database queries with composite index optimization
- Comprehensive test coverage (15 unit tests + 19 e2e tests)
- **Program Endpoints**:
  - `POST /programs` - Create new program
  - `GET /programs` - List all programs with pagination and filtering
  - `GET /programs/:id` - Get program by ID
  - `PATCH /programs/:id` - Update program
  - `DELETE /programs/:id` - Delete program

### Import Module
- Data import functionality for batch operations
- JWT Authentication required for all endpoints
- Rate limiting with `@AuthenticatedRateLimit()` (1000 requests/min per user)
- Support for external data source integration
- Video and channel import capabilities
- Source type filtering and management
- **Import Endpoints**:
  - `POST /import/video` - Import video data
  - `POST /import/channel` - Import channel data
  - `POST /import/by-source-type` - Import by source type
  - `GET /import/sources` - List available import sources

### Discovery Module (Public API)
- **Public API**: No authentication required for discovery endpoints
- **Full-Text Search**: PostgreSQL-based full-text search with relevance ranking
- **Pagination Support**: Offset-based pagination with configurable page size (default: 20, max: 100)
- **Advanced Filtering**: Category, language, media type filtering with composite indexes
- **Rate Limiting**: `@SearchRateLimit()` (30 requests/min per IP) for search/browse endpoints
- **Redis Caching**: Intelligent caching with 5-minute TTL for search/browse, 10-minute for individual programs
- **Cache Invalidation**: Automatic cache clearing when published programs are modified
- **Discovery Endpoints**:
  - `GET /discovery/search` - Search published programs with full-text search and pagination
  - `GET /discovery/browse` - Browse published programs with filtering and pagination  
  - `GET /discovery/programs/:id` - Get individual published program details

### Centralized Error Handling
- `PrismaErrorMapperService` - Maps Prisma error codes to HTTP status codes
- `PrismaExceptionFilter` - Global exception filter for consistent error responses
- No hardcoded Prisma error codes in business logic
- All Prisma errors handled centrally with proper HTTP exceptions

### Rate Limiting & Security
- **Comprehensive Rate Limiting**: Multi-tier rate limiting using @nestjs/throttler
  - **Public Endpoints**: 100 requests per minute per IP address
  - **Authenticated Endpoints**: 1000 requests per minute per user
  - **Search/Query Endpoints**: 30 requests per minute per IP address
- **Smart Tracking**: Per-user limits for authenticated requests, per-IP for public requests
- **Custom Throttler Guard**: `CustomThrottlerGuard` with intelligent request tracking
- **Rate Limit Headers**: Automatic headers with rate limit information and policies
- **Configurable Limits**: Environment variable-based configuration for different endpoints
- **Custom Decorators**: `@PublicRateLimit()`, `@AuthenticatedRateLimit()`, `@SearchRateLimit()`
- **Rate Limit Components**:
  - `src/common/guards/custom-throttler.guard.ts` - Smart request tracking guard
  - `src/common/decorators/throttle-config.decorator.ts` - Rate limit decorators and configs
  - `src/common/interceptors/rate-limit-headers.interceptor.ts` - Response headers interceptor

### API Documentation (Swagger)
- NestJS Swagger integration with `@nestjs/swagger` package
- Interactive Swagger UI available at `/api` endpoint
- Bearer token authentication support in Swagger UI
- Complete API documentation with request/response schemas
- All endpoints documented with descriptions, parameters, and examples
- **Pagination Documentation**: All paginated endpoints include pagination parameters and response schemas
- **Discovery Endpoints**: Public API endpoints fully documented with no authentication required
- Authentication endpoints fully documented with example requests/responses
- DTOs fully documented with property descriptions and example values
- API documentation JSON available at `/api-json` endpoint
- **Auto-Updated**: Swagger documentation automatically reflects all pagination and configuration changes

### Redis Caching System
- **High-Performance Caching**: Redis-based caching for handling 10M+ users/hour
- **Smart TTL Management**: Configurable cache expiration times for different data types
- **Cache Key Strategy**: Intelligent cache key generation including filter parameters
- **Automatic Invalidation**: Cache invalidation on data updates to maintain consistency
- **Cache Hit/Miss Logging**: Comprehensive logging for monitoring and optimization
- **Cached Endpoints**:
  - Discovery search results (TTL: 5 minutes)
  - Discovery browse results (TTL: 5 minutes)
  - Individual program details (TTL: 10 minutes)
  - Categories list (TTL: 30 minutes)
- **Cache Invalidation Triggers**:
  - Program creation, updates, or deletion (published programs only)
  - Category creation, updates, or deletion
  - Pattern-based cache clearing for related keys
- **Error Resilience**: Graceful fallback to database queries when cache is unavailable

### Database Optimization & Pagination System
- **PostgreSQL Full-Text Search**: Optimized search using `to_tsvector()` and `plainto_tsquery()` with GIN indexes
- **Composite Indexes**: Strategic indexes for common query patterns (status + category + language + media type)
- **Pagination Infrastructure**: Offset-based pagination with efficient `COUNT()` queries
- **Search Relevance**: `ts_rank()` based relevance scoring for full-text search results
- **Query Optimization**: Enhanced service methods leveraging composite indexes for better performance
- **Database Indexes**:
  - Full-text search GIN indexes on program names and descriptions
  - Composite indexes for common filter combinations
  - Status index for filtering published content
  - Release date index for chronological ordering
- **Performance**: Optimized for 10M+ users/hour with efficient database queries
- **Pagination Response Format**:
  ```json
  {
    "data": [...],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
  ```

### Comprehensive Testing Suite
- **Unit Tests**: 130+ tests covering all components
  - AuthService: Login, token refresh, user validation
  - AuthController: All endpoints with success/error scenarios
  - JWT Strategy: Token validation and user lookup
  - Local Strategy: Email/password authentication
  - Auth Guards: JWT and Local authentication guards
  - Auth Module: Dependency injection and configuration
  - EmployeesService & Controller: Complete CRUD operations
  - CategoriesService & Controller: Complete CRUD operations
  - ProgramsService: All CRUD operations with filtering and validation
  - ProgramsController: All REST endpoints with query parameters
  - PrismaErrorMapper & ExceptionFilter: Error handling
- **Integration Tests**: Module integration with real dependencies
- **End-to-End Tests**: Complete application flows with real database
  - Full login → access → refresh token lifecycle
  - Protected endpoint access testing
  - Authentication-enabled employee, category, and program CRUD operations
  - Input validation and error handling
  - Database constraint testing and cleanup
- **Test Coverage**: All authentication scenarios, CRUD operations, edge cases, and security validations

### Configuration Management System
- **Type-Safe Configuration**: Strongly-typed configuration interfaces for all environment variables
- **Startup Validation**: Comprehensive validation of all environment variables using class-validator
- **ConfigService**: Injectable service for type-safe access to configuration values
- **Global Configuration**: Environment-based configuration with intelligent defaults
- **Configuration Categories**:
  - **Database**: Connection strings, pool settings
  - **JWT**: Secrets, token expiration times
  - **Redis**: Connection settings, database selection
  - **Rate Limiting**: TTL and limits per endpoint type
  - **Server**: Port, environment mode settings
  - **Cache**: TTL values for different cache types
  - **Pagination**: Default and maximum page sizes
  - **Logging**: Log levels and formatting options
- **Configuration Components**:
  - `src/config/configuration.ts` - Configuration interfaces and factory
  - `src/config/env.validation.ts` - Environment variable validation schema
  - `src/config/config.service.ts` - Type-safe configuration access service
  - `src/config/config.module.ts` - Global configuration module
  - `.env.example` - Complete template with all required variables

## API Usage

### Authentication Flow
1. **Login**: Send POST request to `/auth/login` with email and password
2. **Access Protected Endpoints**: Include `Authorization: Bearer <access_token>` header
3. **Token Refresh**: Use `/auth/refresh` endpoint with refresh token when access token expires

### Example API Usage
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Access protected endpoints
curl -X GET http://localhost:3000/employees \
  -H "Authorization: Bearer <access_token>"

curl -X GET http://localhost:3000/categories \
  -H "Authorization: Bearer <access_token>"

curl -X GET http://localhost:3000/programs \
  -H "Authorization: Bearer <access_token>"

# Refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'

# Create a new program
curl -X POST http://localhost:3000/programs \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Introduction to Programming",
    "description": "A comprehensive programming course",
    "language": "ENGLISH",
    "durationSec": 3600,
    "releaseDate": "2024-01-01T00:00:00.000Z",
    "mediaUrl": "https://example.com/media/program1.mp4",
    "mediaType": "VIDEO"
  }'

# Get programs with filtering and pagination
curl -X GET "http://localhost:3000/programs?language=ENGLISH&mediaType=VIDEO&page=1&limit=10" \
  -H "Authorization: Bearer <access_token>"

# Get recent programs
curl -X GET "http://localhost:3000/programs?recent=5" \
  -H "Authorization: Bearer <access_token>"

# Public discovery endpoints (no authentication required)
# Search with pagination
curl -X GET "http://localhost:3000/discovery/search?q=programming&page=1&limit=20"

# Browse with filtering and pagination
curl -X GET "http://localhost:3000/discovery/browse?categoryId=1&language=ENGLISH&page=2&limit=15"

# Get specific published program
curl -X GET "http://localhost:3000/discovery/programs/1"

# Update a program
curl -X PATCH http://localhost:3000/programs/1 \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Program Title",
    "durationSec": 7200
  }'
```

### Environment Variables Required
All environment variables are validated at startup. See `.env.example` for a complete template.

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/thmanyah_cms"
DATABASE_POOL_MIN=2                      # Minimum database connections (default: 2)
DATABASE_POOL_MAX=10                     # Maximum database connections (default: 10)

# JWT Configuration
JWT_SECRET="your-secret-key-here"        # Required: JWT signing secret
JWT_REFRESH_SECRET="your-refresh-secret" # Required: JWT refresh token secret
JWT_ACCESS_TOKEN_EXPIRES_IN=15m          # Access token expiration (default: 15m)
JWT_REFRESH_TOKEN_EXPIRES_IN=7d          # Refresh token expiration (default: 7d)

# Server Configuration
PORT=3000                                # Server port (default: 3000)
NODE_ENV=development                     # Environment mode (development/production/test/staging)

# Rate Limiting Configuration
THROTTLE_TTL=60                          # Time window in seconds (default: 60)
THROTTLE_LIMIT_PUBLIC=100                # Public endpoint limit per TTL (default: 100)
THROTTLE_LIMIT_AUTHENTICATED=1000        # Authenticated endpoint limit per TTL (default: 1000)  
THROTTLE_LIMIT_SEARCH=30                 # Search endpoint limit per TTL (default: 30)

# Redis Configuration
REDIS_HOST=localhost                     # Redis server host (default: localhost)
REDIS_PORT=6379                         # Redis server port (default: 6379)
REDIS_PASSWORD=                         # Redis password (optional)
REDIS_DB=0                              # Redis database number (default: 0)

# Cache Configuration
CACHE_DEFAULT_TTL=300                   # Default cache TTL in seconds (default: 300)
CACHE_DISCOVERY_SEARCH_TTL=300          # Discovery search cache TTL (default: 300)
CACHE_DISCOVERY_BROWSE_TTL=300          # Discovery browse cache TTL (default: 300)
CACHE_DISCOVERY_PROGRAM_TTL=600         # Individual program cache TTL (default: 600)
CACHE_CATEGORIES_LIST_TTL=1800          # Categories list cache TTL (default: 1800)

# Pagination Configuration
DEFAULT_PAGE_SIZE=20                    # Default pagination page size (default: 20)
MAX_PAGE_SIZE=100                       # Maximum pagination page size (default: 100)

# Logging Configuration
LOG_LEVEL=info                          # Log level (error/warn/info/debug/verbose, default: info)
LOG_FORMAT=combined                     # Log format (combined/common/dev/short/tiny, default: combined)
```

## Database Schema & Migrations

### Database Models
- **Employee**: User accounts with authentication
  - Fields: id, firstName, lastName, email, password, phone, department, position, salary, hireDate, isActive, createdAt, updatedAt
  - Unique constraint on email
- **Category**: Content categorization system
  - Fields: id, name, description, isActive, createdAt, updatedAt
  - Unique constraint on name

### Migration History
- `20250805172112_add_employees_model` - Initial employees table
- `20250805172417_add_password_to_employees` - Added password field to employees
- `20250805200754_add_categories_table` - Added categories table with unique name constraint

### Database Commands
```bash
# Apply migrations in development
npx prisma migrate dev

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate

# Open database GUI
npx prisma studio
```

## Security Features
- **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
- **JWT Security**: Short-lived access tokens with separate refresh tokens
- **Rate Limiting Protection**: Multi-tier rate limiting prevents abuse and DoS attacks
- **Input Validation**: Comprehensive validation using class-validator
- **Error Handling**: Secure error responses that don't leak sensitive information
- **CORS Protection**: Configured for secure cross-origin requests
- **Route Protection**: All sensitive endpoints require valid authentication

## Database Schema & Migrations

### Database Models
- **Employee**: User accounts with authentication
  - Fields: id, firstName, lastName, email, password, phone, department, position, salary, hireDate, isActive, createdAt, updatedAt
  - Unique constraint on email
- **Category**: Content categorization system
  - Fields: id, name, description, isActive, createdAt, updatedAt
  - Unique constraint on name
- **Program**: Media program management
  - Fields: id, name, description, language, durationSec, releaseDate, mediaUrl, mediaType, createdAt, updatedAt
  - Multi-language support (ENGLISH/ARABIC)
  - Media type classification (VIDEO/AUDIO)
  - Duration tracking and release date management
  - Unique program name constraint

### Enums
- **Language**: ENGLISH, ARABIC
- **MediaType**: VIDEO, AUDIO

### Migration History
- `20250805172112_add_employees_model` - Initial employees table
- `20250805172417_add_password_to_employees` - Added password field to employees
- `20250805200754_add_categories_table` - Added categories table with unique name constraint
- `20250805200936_add_programs_table` - Added programs table with enums and constraints
- `20250807102250_add_search_optimization_indexes` - Added comprehensive database indexes for search optimization and performance

### Database Commands
```bash
# Apply migrations in development
npx prisma migrate dev

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate

# Open database GUI
npx prisma studio
```

## Recent Updates & New Features

### ✅ Pagination System (Latest)
- **Complete Pagination Support**: Implemented offset-based pagination across all list endpoints
- **Default Settings**: 20 items per page (default), maximum 100 items per page
- **Endpoints Updated**: 
  - `/programs` - Now returns paginated results with filtering
  - `/discovery/search` - Full-text search with pagination
  - `/discovery/browse` - Browse with filtering and pagination
- **Response Format**: All paginated endpoints return `{data: [], meta: {page, limit, total, totalPages}}`
- **Database Optimization**: Efficient `COUNT()` queries and `LIMIT/OFFSET` implementation
- **Backward Compatible**: All existing filtering options maintained

### ✅ Environment Configuration System (Latest)
- **Type-Safe Configuration**: Complete environment variable validation at startup
- **Comprehensive Variables**: 20+ environment variables covering all aspects (database, JWT, Redis, caching, pagination, etc.)
- **Configuration Service**: Injectable `ConfigService` for type-safe access throughout the application
- **Validation**: Startup validation ensures all required variables are present and valid
- **Template**: Complete `.env.example` file with all required and optional variables documented

### ✅ Database Optimization (Latest)
- **Full-Text Search**: PostgreSQL GIN indexes for optimal text search performance
- **Composite Indexes**: Strategic database indexes for common query patterns
- **Search Performance**: Relevance-based ranking using `ts_rank()` for search results
- **Migration**: `20250807102250_add_search_optimization_indexes` with 15+ performance indexes
- **High Traffic Ready**: Optimized for 10M+ users/hour with efficient database queries

### ✅ Enhanced API Documentation
- **Swagger Integration**: Complete API documentation automatically updated
- **Pagination Documentation**: All pagination parameters and responses documented
- **Public API Docs**: Discovery endpoints clearly marked as public (no auth required)
- **Interactive Testing**: Swagger UI supports testing all pagination and filtering combinations
- **Auto-Generated**: Documentation automatically reflects all code changes

## Production Readiness Checklist

✅ **Authentication & Security**: JWT-based auth with refresh tokens  
✅ **Rate Limiting**: Multi-tier rate limiting (public, authenticated, search)  
✅ **Caching System**: Redis caching with intelligent invalidation  
✅ **Database Optimization**: Full-text search indexes and composite indexes  
✅ **Pagination**: Efficient pagination for all list endpoints  
✅ **Configuration Management**: Type-safe configuration with validation  
✅ **Error Handling**: Centralized error handling with proper HTTP status codes  
✅ **API Documentation**: Complete Swagger documentation  
✅ **Testing Suite**: Comprehensive unit, integration, and e2e tests  
✅ **Environment Validation**: Startup validation of all configuration  

**Performance Target**: 10M+ users/hour with current optimization and caching strategy.

## API Quick Reference

### Public Discovery API (No Auth Required)
```bash
GET /discovery/search?q=programming&page=1&limit=20
GET /discovery/browse?categoryId=1&language=ENGLISH&page=2&limit=15
GET /discovery/programs/:id
```

### Protected Admin API (JWT Required)
```bash
GET /programs?status=PUBLISHED&page=1&limit=25
GET /categories?active=true
GET /employees?page=1&limit=10
```

### Authentication
```bash
POST /auth/login        # Get access & refresh tokens
POST /auth/refresh      # Refresh access token
GET /auth/profile       # Get current user info
```

All endpoints return consistent paginated responses with proper metadata for efficient client-side pagination implementation.
