import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmployeesModule } from './employees/employees.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [PrismaModule, EmployeesModule, AuthModule, CategoriesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
