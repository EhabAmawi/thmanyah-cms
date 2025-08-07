import { plainToInstance, Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsIn,
  Min,
  Max,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  // Database Configuration
  @IsUrl()
  DATABASE_URL: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  DATABASE_POOL_MIN: number = 2;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  DATABASE_POOL_MAX: number = 10;

  // JWT Configuration
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_EXPIRES_IN: string = '7d';

  // Redis Configuration
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(0)
  @Max(15)
  @IsOptional()
  REDIS_DB: number = 0;

  // Rate Limiting Configuration
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_TTL: number = 60;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_PUBLIC: number = 100;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_AUTHENTICATED: number = 1000;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  THROTTLE_LIMIT_SEARCH: number = 30;

  // Server Configuration
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsIn(['development', 'production', 'test', 'staging'])
  @IsOptional()
  NODE_ENV: string = 'development';

  // Cache Configuration
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  CACHE_DEFAULT_TTL: number = 300;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  CACHE_DISCOVERY_SEARCH_TTL: number = 300;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  CACHE_DISCOVERY_BROWSE_TTL: number = 300;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  CACHE_DISCOVERY_PROGRAM_TTL: number = 600;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @IsOptional()
  CACHE_CATEGORIES_LIST_TTL: number = 1800;

  // Pagination Configuration
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  DEFAULT_PAGE_SIZE: number = 20;

  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  MAX_PAGE_SIZE: number = 100;

  // Logging Configuration
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  @IsOptional()
  LOG_LEVEL: string = 'info';

  @IsIn(['combined', 'common', 'dev', 'short', 'tiny'])
  @IsOptional()
  LOG_FORMAT: string = 'combined';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = Object.values(error.constraints || {});
        return `${error.property}: ${constraints.join(', ')}`;
      })
      .join('\n');

    throw new Error(`Configuration validation error:\n${errorMessages}`);
  }

  return validatedConfig;
}
