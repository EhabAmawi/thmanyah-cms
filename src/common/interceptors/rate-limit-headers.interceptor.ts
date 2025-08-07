import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        // The @nestjs/throttler automatically adds headers, but we ensure they're consistent
        const existingHeaders = response.getHeaders();

        // Ensure standard rate limit headers are present
        if (
          !existingHeaders['x-ratelimit-limit'] &&
          !existingHeaders['x-ratelimit-remaining']
        ) {
          // If throttler didn't set headers, we can add default info
          // This happens when rate limiting is not active for the route
          response.setHeader('X-RateLimit-Policy', 'Rate limiting active');
        }

        // Add informational headers about rate limiting policies
        response.setHeader(
          'X-RateLimit-Policy-Info',
          'Public: 100/min per IP, Auth: 1000/min per user, Search: 30/min per IP',
        );
      }),
    );
  }
}
