import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import {
  THROTTLE_CONFIG_KEY,
  ThrottleConfig,
} from '../decorators/throttle-config.decorator';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(options: any, storageService: any, reflector: Reflector) {
    super(options, storageService, reflector);
  }

  protected getTracker(req: Record<string, any>): Promise<string> {
    // For authenticated endpoints, use user ID for per-user limits
    if (req.user?.id) {
      return Promise.resolve(`user-${req.user.id}`);
    }

    // For public endpoints, use IP address for per-IP limits
    const ip =
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      'unknown';

    return Promise.resolve(`ip-${ip}`);
  }

  protected async getErrorMessage(context: ExecutionContext): Promise<string> {
    const customConfig = this.reflector.getAllAndOverride<ThrottleConfig>(
      THROTTLE_CONFIG_KEY,
      [context.getHandler(), context.getClass()],
    );

    return (
      customConfig?.message || 'Too many requests. Please try again later.'
    );
  }
}
