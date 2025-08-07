# Configuration

## Environment Variables

The Thmanyah CMS uses a comprehensive environment-based configuration system with type-safe validation.

## Configuration Architecture

```typescript
// Type-safe configuration with validation
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: configValidationSchema,
      validationOptions: {
        allowUnknown: false,
        abortEarly: true,
      },
    }),
  ],
})
export class AppModule {}
```

## Complete Environment Variables

### Core Configuration

```bash
# Application
NODE_ENV=production                 # Environment: development | staging | production | test
PORT=3000                           # Server port
APP_URL=https://api.thmanyah.com   # Application URL
```

### Database Configuration

```bash
# PostgreSQL Connection
DATABASE_URL=postgresql://username:password@localhost:5432/thmanyah_cms

# Connection Pool Settings
DATABASE_POOL_MIN=2                 # Minimum pool connections (default: 2)
DATABASE_POOL_MAX=10                # Maximum pool connections (default: 10)
DATABASE_POOL_TIMEOUT=10            # Connection timeout in seconds (default: 10)

# Query Settings
DATABASE_QUERY_TIMEOUT=5000         # Query timeout in milliseconds
DATABASE_LOG_QUERIES=false          # Log all SQL queries (debug only)
```

### Authentication & Security

```bash
# JWT Configuration
JWT_SECRET=your-secret-key-min-32-characters-long
JWT_REFRESH_SECRET=your-refresh-secret-min-32-characters
JWT_ACCESS_TOKEN_EXPIRES_IN=15m     # Access token expiration
JWT_REFRESH_TOKEN_EXPIRES_IN=7d     # Refresh token expiration
JWT_ALGORITHM=HS256                 # JWT signing algorithm

# Session Configuration
SESSION_SECRET=your-session-secret-min-32-characters
SESSION_MAX_AGE=86400000            # Session max age in milliseconds (24h)

# Encryption
ENCRYPTION_KEY=64-character-hex-string-for-aes-256-encryption
```

### Redis Cache Configuration

```bash
# Redis Connection
REDIS_HOST=localhost                # Redis server host
REDIS_PORT=6379                     # Redis server port
REDIS_PASSWORD=                     # Redis password (optional)
REDIS_DB=0                          # Redis database number
REDIS_KEY_PREFIX=thmanyah:          # Key prefix for namespacing

# Cache TTL Settings (seconds)
CACHE_DEFAULT_TTL=300               # Default cache TTL (5 minutes)
CACHE_DISCOVERY_SEARCH_TTL=300      # Search results cache (5 minutes)
CACHE_DISCOVERY_BROWSE_TTL=300      # Browse results cache (5 minutes)
CACHE_DISCOVERY_PROGRAM_TTL=600     # Individual program cache (10 minutes)
CACHE_CATEGORIES_LIST_TTL=1800      # Categories list cache (30 minutes)
CACHE_WARM_ON_START=true            # Warm cache on application start
```

### Rate Limiting

```bash
# Rate Limiting Configuration
THROTTLE_TTL=60                     # Time window in seconds
THROTTLE_LIMIT_PUBLIC=100           # Public endpoints (per IP)
THROTTLE_LIMIT_AUTHENTICATED=1000   # Authenticated endpoints (per user)
THROTTLE_LIMIT_SEARCH=30            # Search endpoints (per IP)
THROTTLE_LIMIT_ADMIN=100            # Admin operations (per user)
THROTTLE_SKIP_IF_LOCALHOST=false    # Skip rate limiting for localhost
```

### Pagination

```bash
# Pagination Defaults
DEFAULT_PAGE_SIZE=20                # Default items per page
MAX_PAGE_SIZE=100                   # Maximum items per page
MIN_PAGE_SIZE=1                     # Minimum items per page
```

### Logging

```bash
# Logging Configuration
LOG_LEVEL=info                      # Log level: error | warn | info | debug | verbose
LOG_FORMAT=json                     # Log format: json | pretty | simple
LOG_FILE_ENABLED=true               # Enable file logging
LOG_FILE_PATH=./logs                # Log file directory
LOG_FILE_MAX_SIZE=10485760          # Max log file size (10MB)
LOG_FILE_MAX_FILES=10               # Maximum number of log files to keep
LOG_CONSOLE_ENABLED=true            # Enable console logging
```

### External Services

```bash
# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key
YOUTUBE_API_QUOTA_LIMIT=10000       # Daily quota limit

# Vimeo API
VIMEO_ACCESS_TOKEN=your-vimeo-access-token
VIMEO_CLIENT_ID=your-client-id
VIMEO_CLIENT_SECRET=your-client-secret

# AWS Configuration (for S3 storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=thmanyah-media
AWS_S3_ENDPOINT=https://s3.amazonaws.com
```

### Email Configuration

```bash
# SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false                   # true for 465, false for other ports
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@thmanyah.com
SMTP_FROM_NAME=Thmanyah CMS
```

### Monitoring & Metrics

```bash
# Prometheus Metrics
METRICS_ENABLED=true
METRICS_PORT=9090
METRICS_PATH=/metrics

# Sentry Error Tracking
SENTRY_DSN=https://your-key@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0             # 100% of errors
SENTRY_TRACES_SAMPLE_RATE=0.1      # 10% of transactions
```

### Feature Flags

```bash
# Feature Toggles
FEATURE_ELASTICSEARCH=false         # Use Elasticsearch instead of PostgreSQL FTS
FEATURE_WEBSOCKET=false             # Enable WebSocket support
FEATURE_GRAPHQL=false               # Enable GraphQL endpoint
FEATURE_MULTI_TENANT=false          # Enable multi-tenancy
FEATURE_AI_RECOMMENDATIONS=false    # Enable AI-powered recommendations
```

## Environment Files

### Development (.env.development)

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/thmanyah_cms_dev
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=development-secret-key-not-for-production
JWT_ACCESS_TOKEN_EXPIRES_IN=1h
LOG_LEVEL=debug
LOG_FORMAT=pretty
THROTTLE_SKIP_IF_LOCALHOST=true
```

### Staging (.env.staging)

```bash
NODE_ENV=staging
PORT=3000
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/thmanyah_cms_staging
REDIS_HOST=staging-redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=staging-redis-password
JWT_SECRET=${STAGING_JWT_SECRET}
LOG_LEVEL=info
LOG_FORMAT=json
METRICS_ENABLED=true
```

### Production (.env.production)

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=${PROD_DATABASE_URL}
DATABASE_POOL_MAX=50
REDIS_HOST=${PROD_REDIS_HOST}
REDIS_PASSWORD=${PROD_REDIS_PASSWORD}
JWT_SECRET=${PROD_JWT_SECRET}
JWT_REFRESH_SECRET=${PROD_JWT_REFRESH_SECRET}
LOG_LEVEL=warn
LOG_FORMAT=json
LOG_FILE_ENABLED=true
METRICS_ENABLED=true
SENTRY_DSN=${PROD_SENTRY_DSN}
```

### Testing (.env.test)

```bash
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/thmanyah_cms_test
REDIS_HOST=localhost
REDIS_PORT=6380
JWT_SECRET=test-secret-key
JWT_ACCESS_TOKEN_EXPIRES_IN=1m
LOG_LEVEL=error
THROTTLE_SKIP_IF_LOCALHOST=true
```

## Configuration Validation

### Validation Schema

```typescript
import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .required(),
  
  PORT: Joi.number()
    .port()
    .default(3000),
  
  DATABASE_URL: Joi.string()
    .pattern(/^postgresql:\/\//)
    .required(),
  
  DATABASE_POOL_MIN: Joi.number()
    .min(1)
    .max(100)
    .default(2),
  
  DATABASE_POOL_MAX: Joi.number()
    .min(1)
    .max(100)
    .default(10),
  
  JWT_SECRET: Joi.string()
    .min(32)
    .required(),
  
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .default('15m'),
  
  REDIS_HOST: Joi.string()
    .hostname()
    .required(),
  
  REDIS_PORT: Joi.number()
    .port()
    .default(6379),
  
  THROTTLE_LIMIT_PUBLIC: Joi.number()
    .min(1)
    .max(10000)
    .default(100),
  
  DEFAULT_PAGE_SIZE: Joi.number()
    .min(1)
    .max(100)
    .default(20),
});
```

## Type-Safe Configuration Service

```typescript
@Injectable()
export class ConfigService {
  constructor(
    @Inject(CONFIGURATION) private config: Configuration
  ) {}
  
  get database(): DatabaseConfig {
    return this.config.database;
  }
  
  get jwt(): JwtConfig {
    return this.config.jwt;
  }
  
  get redis(): RedisConfig {
    return this.config.redis;
  }
  
  get throttle(): ThrottleConfig {
    return this.config.throttle;
  }
  
  get cache(): CacheConfig {
    return this.config.cache;
  }
  
  get isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }
  
  get isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }
}
```

## Configuration Interfaces

```typescript
export interface Configuration {
  nodeEnv: string;
  port: number;
  database: DatabaseConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  throttle: ThrottleConfig;
  cache: CacheConfig;
  pagination: PaginationConfig;
  logging: LoggingConfig;
  external: ExternalServicesConfig;
}

export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
  poolTimeout: number;
  queryTimeout: number;
  logQueries: boolean;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  algorithm: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

export interface ThrottleConfig {
  ttl: number;
  limitPublic: number;
  limitAuthenticated: number;
  limitSearch: number;
  limitAdmin: number;
  skipIfLocalhost: boolean;
}

export interface CacheConfig {
  defaultTtl: number;
  discoverySearchTtl: number;
  discoveryBrowseTtl: number;
  discoveryProgramTtl: number;
  categoriesListTtl: number;
  warmOnStart: boolean;
}
```

## Dynamic Configuration

### Runtime Configuration Updates

```typescript
@Injectable()
export class DynamicConfigService {
  private configCache = new Map<string, any>();
  
  async getConfig(key: string): Promise<any> {
    // Check cache first
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }
    
    // Fetch from database
    const config = await this.prisma.configuration.findUnique({
      where: { key }
    });
    
    if (config) {
      this.configCache.set(key, config.value);
      return config.value;
    }
    
    // Fall back to environment variable
    return process.env[key];
  }
  
  async setConfig(key: string, value: any): Promise<void> {
    await this.prisma.configuration.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
    
    this.configCache.set(key, value);
    
    // Notify other instances via Redis
    await this.redis.publish('config:updated', JSON.stringify({ key, value }));
  }
}
```

## Secret Management

### AWS Secrets Manager Integration

```typescript
import { SecretsManager } from 'aws-sdk';

@Injectable()
export class SecretsService {
  private secretsManager = new SecretsManager({
    region: process.env.AWS_REGION
  });
  
  async getSecret(secretName: string): Promise<string> {
    const result = await this.secretsManager
      .getSecretValue({ SecretId: secretName })
      .promise();
    
    return result.SecretString;
  }
  
  async loadSecrets(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      // Load sensitive configurations from AWS Secrets Manager
      process.env.DATABASE_URL = await this.getSecret('thmanyah/database/url');
      process.env.JWT_SECRET = await this.getSecret('thmanyah/jwt/secret');
      process.env.REDIS_PASSWORD = await this.getSecret('thmanyah/redis/password');
    }
  }
}
```

### HashiCorp Vault Integration

```typescript
import * as vault from 'node-vault';

@Injectable()
export class VaultService {
  private client = vault({
    endpoint: process.env.VAULT_ENDPOINT,
    token: process.env.VAULT_TOKEN
  });
  
  async getSecret(path: string): Promise<any> {
    const result = await this.client.read(path);
    return result.data;
  }
}
```

## Configuration Management Strategy

### Security Principles

1. **Never Commit Secrets**: All sensitive values in environment variables
2. **Strong Secret Generation**: Minimum 32-character secrets for JWT and encryption
3. **Early Validation**: Configuration validated at application startup
4. **Environment Isolation**: Separate configs for development, staging, production

### Production Deployment

```bash
# Use orchestrator environment variables
docker run -e DATABASE_URL=$DATABASE_URL \
           -e JWT_SECRET=$JWT_SECRET \
           -e REDIS_PASSWORD=$REDIS_PASSWORD \
           thmanyah-cms:latest
```

### Configuration Validation

The system validates all configuration at startup using Joi schemas, ensuring type safety and preventing runtime errors from misconfiguration.

## Related Documentation

- [Architecture Overview](./ARCHITECTURE.md)
- [Security](./SECURITY.md)
- [Docker Deployment](./DOCKER.md)
- [Scalability](./SCALABILITY.md)