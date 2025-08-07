# GEMINI.md

This file provides guidance to Gemini when working with code in this repository. It is based on the previous agent's documentation (`CLAUDE.md`).

## Project Overview

This is a NestJS TypeScript CMS application called "thmanyah-cms". It follows standard NestJS architecture patterns with a modular structure using decorators, dependency injection, and the MVC pattern. The application uses PostgreSQL with Prisma as the ORM.

## Development Commands

The project uses Yarn as the package manager.

### General
- **Install dependencies**: `yarn install`
- **Development server with hot reload**: `yarn run start:dev`
- **Production build**: `yarn run build`
- **Start production server**: `yarn run start:prod`

### Linting and Formatting
- **Linting**: `yarn run lint`
- **Formatting**: `yarn run format`

### Testing
- **Unit tests**: `yarn run test`
- **Watch mode**: `yarn run test:watch`
- **Coverage report**: `yarn run test:cov`
- **End-to-end tests**: `yarn run test:e2e`

### Database (Prisma)
- **Generate Prisma client**: `npx prisma generate`
- **Run migrations in development**: `npx prisma migrate dev`
- **Run migrations in production**: `npx prisma migrate deploy`
- **Push schema to database (for prototyping)**: `npx prisma db push`
- **Open Prisma Studio (database GUI)**: `npx prisma studio`

## Architecture

- **Framework**: NestJS with Express platform
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based authentication with Passport.js
- **Language**: TypeScript
- **Structure**: Standard NestJS modular architecture
  - `src/main.ts` - Application bootstrap (runs on port 3000 or PORT env var)
  - `src/app.module.ts` - Root application Module
  - `src/auth/` - Authentication module with JWT and local strategies
  - `src/employees/` - Employee management module
  - `src/categories/` - Category management module
  - `src/programs/` - Program management module
  - `src/prisma/` - Prisma service and module for database integration
  - `src/common/` - Shared services and filters (e.g., exception handling)
- **Testing**: Jest for unit tests, Supertest for e2e tests
- **Build**: NestJS CLI build system outputting to `dist/`

## Key Configuration Files

- `nest-cli.json`: NestJS CLI configuration
- `tsconfig.json` / `tsconfig.build.json`: TypeScript configuration
- `eslint.config.mjs`: ESLint configuration with Prettier integration
- `test/jest-e2e.json`: E2E test configuration
- `prisma/schema.prisma`: Prisma database schema
- `.env`: Environment variables (DATABASE_URL, JWT_SECRET)

## Implemented Features

### Authentication & Authorization
- **JWT-based Authentication**: Uses access (15min) and refresh (7 days) tokens.
- **Endpoints**:
  - `POST /auth/login`: Login with email/password.
  - `POST /auth/refresh`: Refresh access token.
  - `GET /auth/profile`: Get authenticated user profile.

### Modules (CRUD Operations)
All module endpoints require JWT Bearer token authentication.
- **Employees**: Manages employee data.
- **Categories**: Manages content categories.
- **Programs**: Manages programs with multi-language and media type support.

### Centralized Error Handling
- A global exception filter (`PrismaExceptionFilter`) and a mapper service (`PrismaErrorMapperService`) provide consistent error responses for Prisma-related errors.

### API Documentation (Swagger)
- Interactive Swagger UI is available at `/api`.
- API documentation JSON is available at `/api-json`.

## API Usage

### Authentication Flow
1.  **Login**: Send a `POST` request to `/auth/login` with email and password to get access and refresh tokens.
2.  **Access Protected Endpoints**: Include `Authorization: Bearer <access_token>` in the header.
3.  **Token Refresh**: When the access token expires, use the `/auth/refresh` endpoint with the refresh token to get a new access token.

### Example
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Access a protected endpoint
curl -X GET http://localhost:3000/employees \
  -H "Authorization: Bearer <access_token>"
```

## Environment Variables Required

Create a `.env` file in the root directory with the following variables:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/thmanyah_cms"
JWT_SECRET="your-super-secret-key"
PORT=3000 # Optional, defaults to 3000
```

## Database Schema & Migrations

### Models
- **Employee**: Stores user data for authentication and management.
- **Category**: For content categorization.
- **Program**: For media program management, with support for different languages and media types.

### Enums
- **Language**: `ENGLISH`, `ARABIC`
- **MediaType**: `VIDEO`, `AUDIO`

### Migrations
Migrations are managed by Prisma Migrate. See the `prisma/migrations` directory for the history. To apply migrations, use `npx prisma migrate dev`.