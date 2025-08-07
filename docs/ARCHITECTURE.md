# Architecture Overview

## Technology Stack

The Thmanyah CMS is built on a modern, scalable technology stack designed for high performance and maintainability.

### Core Technologies

- **Framework**: [NestJS](https://nestjs.com/) with TypeScript
- **Runtime**: Node.js 18+ (LTS)
- **Database**: PostgreSQL 14+ with Prisma ORM
- **Caching**: Redis 6+ for distributed caching
- **Authentication**: JWT-based with Passport.js
- **Container**: Docker with multi-stage builds
- **Web Server**: Nginx reverse proxy (production)
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest for unit/integration/e2e tests

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Load Balancer │────▶│      Nginx      │────▶│    NestJS App   │
│   (CloudFlare)  │     │  (Reverse Proxy)│     │   (Clustered)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                          │
                              ┌───────────────────────────┼───────────────────────────┐
                              │                           │                           │
                        ┌─────▼─────┐            ┌────────▼────────┐         ┌────────▼────────┐
                        │   Redis    │            │   PostgreSQL    │         │  External APIs  │
                        │   Cache    │            │    Database     │         │   (YouTube,     │
                        └────────────┘            └─────────────────┘         │    Vimeo)       │
                                                                              └─────────────────┘
```

## Module Structure

The application follows NestJS's modular architecture pattern, promoting separation of concerns and maintainability.

```
src/
├── auth/                 # Authentication & Authorization
│   ├── strategies/       # JWT and Local Passport strategies
│   ├── guards/          # Authentication guards
│   ├── dto/             # Login/Refresh DTOs
│   └── auth.service.ts  # Token generation and validation
│
├── employees/           # User Management
│   ├── dto/            # Employee CRUD DTOs
│   ├── entities/       # Employee entity definitions
│   └── employees.service.ts
│
├── categories/          # Content Categorization
│   ├── dto/            # Category DTOs
│   └── categories.service.ts
│
├── programs/            # Core Content Management
│   ├── dto/            # Program DTOs with pagination
│   ├── entities/       # Program entity definitions
│   └── programs.service.ts
│
├── discovery/           # Public Content Discovery
│   ├── dto/            # Search and browse DTOs
│   └── discovery.service.ts
│
├── import/              # External Content Import
│   ├── strategies/     # YouTube, Vimeo, RSS importers
│   └── import.service.ts
│
├── cache/               # Redis Caching Layer
│   ├── cache.service.ts
│   └── cache.module.ts
│
├── prisma/              # Database ORM
│   ├── prisma.service.ts
│   └── prisma.module.ts
│
├── config/              # Configuration Management
│   ├── configuration.ts
│   ├── env.validation.ts
│   └── config.service.ts
│
└── common/              # Shared Utilities
    ├── decorators/      # Custom decorators
    ├── filters/         # Exception filters
    ├── guards/          # Rate limiting guards
    ├── interceptors/    # Logging, transformation
    └── dto/             # Pagination DTOs
```

## Design Patterns

### Dependency Injection

NestJS's built-in IoC container manages all dependencies:

```typescript
@Injectable()
export class ProgramsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}
}
```

### Repository Pattern

Prisma ORM provides a clean data access layer:

```typescript
// Clean separation of data access
await this.prisma.program.findMany({
  where: { status: Status.PUBLISHED },
  include: { category: true }
});
```

### DTO Pattern

Data Transfer Objects ensure type safety and validation:

```typescript
export class CreateProgramDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEnum(MediaType)
  mediaType: MediaType;
}
```

### Decorator Pattern

Custom decorators for cross-cutting concerns:

```typescript
@PublicRateLimit()  // 100 req/min
@Get('search')
async search(@Query() dto: SearchDto) { }
```

## Request Lifecycle

1. **Request Arrives**: Nginx receives HTTP request
2. **Rate Limiting**: Custom throttler guard checks limits
3. **Authentication**: JWT validation (if protected route)
4. **Validation**: DTO validation via class-validator
5. **Business Logic**: Service layer processing
6. **Caching**: Check/update Redis cache
7. **Database**: Prisma ORM database operations
8. **Response**: Transformation and serialization
9. **Logging**: Request/response logging

## Error Handling

Centralized error handling with custom filters:

```typescript
@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    // Map Prisma errors to HTTP exceptions
  }
}
```

## Asynchronous Architecture

### Event-Driven Communication

Future implementation for scalability:

```typescript
// Event emitter for internal events
@Injectable()
export class ProgramsService {
  @OnEvent('program.created')
  async handleProgramCreated(payload: ProgramCreatedEvent) {
    await this.cacheService.invalidate();
    await this.searchService.index(payload);
  }
}
```

### Queue Processing

Planned implementation for heavy operations:

```typescript
// Bull queue for background jobs
@Processor('import')
export class ImportProcessor {
  @Process('youtube')
  async importYouTube(job: Job) {
    // Process YouTube import
  }
}
```

## Microservices Ready

The modular architecture allows easy transition to microservices:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Auth Service│     │Content Service│    │Search Service│
└──────┬───────┘     └──────┬────────┘    └──────┬───────┘
       │                    │                     │
       └────────────────────┼─────────────────────┘
                           │
                    ┌──────▼───────┐
                    │  API Gateway  │
                    └───────────────┘
```

## Development Principles

### SOLID Principles

- **Single Responsibility**: Each service handles one domain
- **Open/Closed**: Extensible via decorators and modules
- **Liskov Substitution**: Interface-based programming
- **Interface Segregation**: Focused service interfaces
- **Dependency Inversion**: Depend on abstractions

### Clean Architecture

```
┌─────────────────────────────────────┐
│          Presentation Layer         │  Controllers, DTOs
├─────────────────────────────────────┤
│          Application Layer          │  Services, Use Cases
├─────────────────────────────────────┤
│            Domain Layer             │  Entities, Business Logic
├─────────────────────────────────────┤
│         Infrastructure Layer        │  Database, Cache, External APIs
└─────────────────────────────────────┘
```

## Testing Strategy

### Test Pyramid

```
        /\          E2E Tests (10%)
       /  \         Integration Tests (30%)
      /    \        Unit Tests (60%)
     /______\
```

### Test Coverage

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Critical paths
- **E2E Tests**: User journeys
- **Performance Tests**: Load testing

## Monitoring & Observability

### Logging

Structured logging with context:

```typescript
this.logger.log({
  message: 'Program created',
  programId: program.id,
  userId: user.id,
  timestamp: new Date()
});
```

### Metrics

Key metrics tracked:
- Request rate and latency
- Cache hit/miss ratio
- Database query performance
- Error rates and types

### Health Checks

```typescript
@Get('health')
@HealthCheck()
check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.redis.pingCheck('redis'),
  ]);
}
```

## Related Documentation

- [Database Design](./DATABASE.md)
- [API Documentation](./API.md)
- [Security](./SECURITY.md)
- [Scalability](./SCALABILITY.md)