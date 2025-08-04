import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { EmployeesModule } from './employees/employees.module';

@Module({
  imports: [PrismaModule, EmployeesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
