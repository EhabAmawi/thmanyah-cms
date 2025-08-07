import { SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

export interface ThrottleConfig {
  limit: number;
  ttl: number;
  message?: string;
}

export const THROTTLE_CONFIG_KEY = 'throttle_config';
export const ThrottleConfig = (config: ThrottleConfig) =>
  SetMetadata(THROTTLE_CONFIG_KEY, config);

// Predefined configurations using @nestjs/throttler decorators
export const PublicRateLimit = () =>
  Throttle({ 
    default: { 
      limit: parseInt(process.env.THROTTLE_LIMIT_PUBLIC || '100'), 
      ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000 
    } 
  });

export const AuthenticatedRateLimit = () =>
  Throttle({ 
    authenticated: { 
      limit: parseInt(process.env.THROTTLE_LIMIT_AUTHENTICATED || '1000'), 
      ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000 
    } 
  });

export const SearchRateLimit = () =>
  Throttle({ 
    search: { 
      limit: parseInt(process.env.THROTTLE_LIMIT_SEARCH || '30'), 
      ttl: parseInt(process.env.THROTTLE_TTL || '60') * 1000 
    } 
  });