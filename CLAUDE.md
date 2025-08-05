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
- **Authentication**: JWT-based authentication with Passport.js
- **Language**: TypeScript
- **Structure**: Standard NestJS modular architecture
  - `src/main.ts` - Application bootstrap (runs on port 3000 or PORT env var)
  - `src/app.module.ts` - Root application Module
  - `src/app.controller.ts` - Main controller
  - `src/app.service.ts` - Main service
  - `src/auth/` - Authentication module with JWT and local strategies
  - `src/employees/` - Employee management module
  - `src/prisma/` - Prisma service and module for database integration
  - `src/common/` - Shared services and filters
- **Testing**: Jest for unit tests, Supertest for e2e tests
- **Build**: NestJS CLI build system outputting to `dist/`

## Key Configuration Files

- `nest-cli.json` - NestJS CLI configuration
- `tsconfig.json` / `tsconfig.build.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration with Prettier integration
- `test/jest-e2e.json` - E2E test configuration
- `prisma/schema.prisma` - Prisma database schema
- `.env` - Environment variables (DATABASE_URL, JWT_SECRET for authentication)

## Development Notes

- The project follows NestJS conventions with modules, controllers, and providers
- ESLint is configured with Prettier for code formatting
- Jest is configured to run tests from the `src` directory with `.spec.ts` pattern
- E2E tests are in the `test` directory
- Prisma is configured with PostgreSQL and integrated as a global module
- Authentication is required for all employee endpoints (JWT Bearer token)
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
- **Authentication Endpoints**:
  - `POST /auth/login` - Login with email/password
  - `POST /auth/refresh` - Refresh access token using refresh token
  - `POST /auth/profile` - Get authenticated user profile

### Employees Module
- Complete CRUD operations with REST API endpoints
- JWT Authentication required for all endpoints
- Prisma database integration with PostgreSQL
- Password field included in employee model with automatic hashing
- Query filtering (active employees, by department)
- Password exclusion from all API responses for security
- Comprehensive test coverage (unit + integration + e2e tests)

### Centralized Error Handling
- `PrismaErrorMapperService` - Maps Prisma error codes to HTTP status codes
- `PrismaExceptionFilter` - Global exception filter for consistent error responses
- No hardcoded Prisma error codes in business logic
- All Prisma errors handled centrally with proper HTTP exceptions

### API Documentation (Swagger)
- NestJS Swagger integration with `@nestjs/swagger` package
- Interactive Swagger UI available at `/api` endpoint
- Bearer token authentication support in Swagger UI
- Complete API documentation with request/response schemas
- All endpoints documented with descriptions, parameters, and examples
- Authentication endpoints fully documented with example requests/responses
- DTOs fully documented with property descriptions and example values
- API documentation JSON available at `/api-json` endpoint

### Comprehensive Testing Suite
- **Unit Tests**: 99+ tests covering all auth components
  - AuthService: Login, token refresh, user validation
  - AuthController: All endpoints with success/error scenarios
  - JWT Strategy: Token validation and user lookup
  - Local Strategy: Email/password authentication
  - Auth Guards: JWT and Local authentication guards
  - Auth Module: Dependency injection and configuration
- **Integration Tests**: Auth module integration with real dependencies
- **End-to-End Tests**: Complete authentication flows with real database
  - Full login → access → refresh token lifecycle
  - Protected endpoint access testing
  - Authentication-enabled employee CRUD operations
  - Input validation and error handling
- **Test Coverage**: All authentication scenarios, edge cases, and security validations

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

# Access protected endpoint
curl -X GET http://localhost:3000/employees \
  -H "Authorization: Bearer <access_token>"

# Refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<refresh_token>"}'
```

### Environment Variables Required
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/thmanyah_cms"
JWT_SECRET="your-secret-key-here"
PORT=3000  # Optional, defaults to 3000
```

## Security Features
- **Password Hashing**: All passwords are hashed using bcrypt with salt rounds
- **JWT Security**: Short-lived access tokens with separate refresh tokens
- **Input Validation**: Comprehensive validation using class-validator
- **Error Handling**: Secure error responses that don't leak sensitive information
- **CORS Protection**: Configured for secure cross-origin requests
- **Route Protection**: All sensitive endpoints require valid authentication