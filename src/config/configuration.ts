export interface DatabaseConfig {
  url: string;
  poolMin: number;
  poolMax: number;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface RateLimitConfig {
  ttl: number;
  limitPublic: number;
  limitAuthenticated: number;
  limitSearch: number;
}

export interface ServerConfig {
  port: number;
  nodeEnv: string;
}

export interface CacheConfig {
  defaultTtl: number;
  discoverySearchTtl: number;
  discoveryBrowseTtl: number;
  discoveryProgramTtl: number;
  categoriesListTtl: number;
}

export interface PaginationConfig {
  defaultPageSize: number;
  maxPageSize: number;
}

export interface LoggingConfig {
  level: string;
  format: string;
}

export interface AppConfig {
  database: DatabaseConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  rateLimit: RateLimitConfig;
  server: ServerConfig;
  cache: CacheConfig;
  pagination: PaginationConfig;
  logging: LoggingConfig;
}

export default (): AppConfig => ({
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/thmanyah_cms',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  rateLimit: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limitPublic: parseInt(process.env.THROTTLE_LIMIT_PUBLIC || '100', 10),
    limitAuthenticated: parseInt(
      process.env.THROTTLE_LIMIT_AUTHENTICATED || '1000',
      10,
    ),
    limitSearch: parseInt(process.env.THROTTLE_LIMIT_SEARCH || '30', 10),
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  cache: {
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10),
    discoverySearchTtl: parseInt(
      process.env.CACHE_DISCOVERY_SEARCH_TTL || '300',
      10,
    ),
    discoveryBrowseTtl: parseInt(
      process.env.CACHE_DISCOVERY_BROWSE_TTL || '300',
      10,
    ),
    discoveryProgramTtl: parseInt(
      process.env.CACHE_DISCOVERY_PROGRAM_TTL || '600',
      10,
    ),
    categoriesListTtl: parseInt(
      process.env.CACHE_CATEGORIES_LIST_TTL || '1800',
      10,
    ),
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },
});
