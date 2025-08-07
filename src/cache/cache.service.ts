import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';

export interface CacheOptions {
  ttl?: number;
  logHitMiss?: boolean;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);

      if (options?.logHitMiss) {
        if (value) {
          this.logger.log(`Cache HIT for key: ${key}`);
        } else {
          this.logger.log(`Cache MISS for key: ${key}`);
        }
      }

      return value || null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl;
      await this.cacheManager.set(key, value, ttl);

      if (options?.logHitMiss) {
        this.logger.log(
          `Cache SET for key: ${key} with TTL: ${ttl || 'default'}`,
        );
      }
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.log(`Cache DELETED key: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DELETE error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      // Get all keys matching the pattern
      const keys = await this.getKeys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.del(key)));
        this.logger.log(
          `Cache DELETED ${keys.length} keys matching pattern: ${pattern}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Cache DELETE PATTERN error for pattern ${pattern}:`,
        error,
      );
    }
  }

  private async getKeys(pattern: string): Promise<string[]> {
    try {
      // Access the Redis client through the cache manager
      const store = (this.cacheManager as any).store;
      if (store?.getClient) {
        const client = store.getClient();
        return await client.keys(pattern);
      }
      return [];
    } catch (error) {
      this.logger.error(`Error getting keys for pattern ${pattern}:`, error);
      return [];
    }
  }

  async reset(): Promise<void> {
    try {
      // For the newer version of cache-manager, we need to use a different approach
      const store = (this.cacheManager as any).store;
      if (store?.reset) {
        await store.reset();
      } else if (store?.getClient) {
        const client = store.getClient();
        await client.flushAll();
      }
      this.logger.log('Cache RESET - all keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
    }
  }

  // Helper method to generate cache keys with parameters
  generateKey(prefix: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (result, key) => {
          if (params[key] !== undefined && params[key] !== null) {
            result[key] = params[key];
          }
          return result;
        },
        {} as Record<string, any>,
      );

    const paramString =
      Object.keys(sortedParams).length > 0 ? JSON.stringify(sortedParams) : '';

    return `${prefix}:${Buffer.from(paramString).toString('base64')}`;
  }
}
