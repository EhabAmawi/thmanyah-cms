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
- **Language**: TypeScript
- **Structure**: Standard NestJS modular architecture
  - `src/main.ts` - Application bootstrap (runs on port 3000 or PORT env var)
  - `src/app.module.ts` - Root application Module
  - `src/app.controller.ts` - Main controller
  - `src/app.service.ts` - Main service
  - `src/prisma/` - Prisma service and module for database integration
- **Testing**: Jest for unit tests, Supertest for e2e tests
- **Build**: NestJS CLI build system outputting to `dist/`

## Key Configuration Files

- `nest-cli.json` - NestJS CLI configuration
- `tsconfig.json` / `tsconfig.build.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration with Prettier integration
- `test/jest-e2e.json` - E2E test configuration
- `prisma/schema.prisma` - Prisma database schema
- `.env` - Environment variables (DATABASE_URL for PostgreSQL connection)

## Development Notes

- The project follows NestJS conventions with modules, controllers, and providers
- ESLint is configured with Prettier for code formatting
- Jest is configured to run tests from the `src` directory with `.spec.ts` pattern
- E2E tests are in the `test` directory
- Prisma is configured with PostgreSQL and integrated as a global module
- Update DATABASE_URL in `.env` with your PostgreSQL connection string before running migrations

## Features Implemented

### Employees Module
- Complete CRUD operations with REST API endpoints
- Prisma database integration with PostgreSQL
- Query filtering (active employees, by department)
- Comprehensive test coverage (unit + integration tests)

### Centralized Error Handling
- `PrismaErrorMapperService` - Maps Prisma error codes to HTTP status codes
- `PrismaExceptionFilter` - Global exception filter for consistent error responses
- No hardcoded Prisma error codes in business logic
- All Prisma errors handled centrally with proper HTTP exceptions

### API Documentation (Swagger)
- NestJS Swagger integration with `@nestjs/swagger` package
- Interactive Swagger UI available at `/api` endpoint
- Complete API documentation with request/response schemas
- All endpoints documented with descriptions, parameters, and examples
- DTOs fully documented with property descriptions and example values
- API documentation JSON available at `/api-json` endpoint