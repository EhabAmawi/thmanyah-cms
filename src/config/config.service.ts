import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  AppConfig,
  DatabaseConfig,
  JwtConfig,
  RedisConfig,
  RateLimitConfig,
  ServerConfig,
  CacheConfig,
  PaginationConfig,
  LoggingConfig,
} from './configuration';

@Injectable()
export class ConfigService {
  constructor(
    private readonly nestConfigService: NestConfigService<AppConfig, true>,
  ) {}

  get database(): DatabaseConfig {
    return this.nestConfigService.get('database', { infer: true });
  }

  get jwt(): JwtConfig {
    return this.nestConfigService.get('jwt', { infer: true });
  }

  get redis(): RedisConfig {
    return this.nestConfigService.get('redis', { infer: true });
  }

  get rateLimit(): RateLimitConfig {
    return this.nestConfigService.get('rateLimit', { infer: true });
  }

  get server(): ServerConfig {
    return this.nestConfigService.get('server', { infer: true });
  }

  get cache(): CacheConfig {
    return this.nestConfigService.get('cache', { infer: true });
  }

  get pagination(): PaginationConfig {
    return this.nestConfigService.get('pagination', { infer: true });
  }

  get logging(): LoggingConfig {
    return this.nestConfigService.get('logging', { infer: true });
  }

  // Convenience methods for common configurations
  get port(): number {
    return this.server.port;
  }

  get isDevelopment(): boolean {
    return this.server.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.server.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.server.nodeEnv === 'test';
  }

  get databaseUrl(): string {
    return this.database.url;
  }

  get jwtSecret(): string {
    return this.jwt.secret;
  }

  get jwtRefreshSecret(): string {
    return this.jwt.refreshSecret;
  }

  get redisConfig(): RedisConfig {
    return this.redis;
  }

  get defaultPageSize(): number {
    return this.pagination.defaultPageSize;
  }

  get maxPageSize(): number {
    return this.pagination.maxPageSize;
  }
}
