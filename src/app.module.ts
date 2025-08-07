import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config';
import { ConfigService } from './config';
import { PrismaModule } from './prisma/prisma.module';
import { EmployeesModule } from './employees/employees.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProgramsModule } from './programs/programs.module';
import { ImportModule } from './import/import.module';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { RateLimitHeadersInterceptor } from './common/interceptors/rate-limit-headers.interceptor';
import { DiscoveryModule } from './discovery/discovery.module';
import { CacheModule } from './cache';

@Module({
  imports: [
    ConfigModule,
    CacheModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.rateLimit.ttl * 1000,
          limit: configService.rateLimit.limitPublic,
        },
        {
          name: 'authenticated',
          ttl: configService.rateLimit.ttl * 1000,
          limit: configService.rateLimit.limitAuthenticated,
        },
        {
          name: 'search',
          ttl: configService.rateLimit.ttl * 1000,
          limit: configService.rateLimit.limitSearch,
        },
      ],
    }),
    PrismaModule,
    EmployeesModule,
    AuthModule,
    CategoriesModule,
    ProgramsModule,
    ImportModule,
    DiscoveryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitHeadersInterceptor,
    },
  ],
})
export class AppModule {}
