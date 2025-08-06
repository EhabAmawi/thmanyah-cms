import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { AdapterFactory } from './adapters/adapter.factory';
import { YouTubeAdapter } from './adapters/youtube.adapter';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ImportController],
  providers: [ImportService, YouTubeAdapter, AdapterFactory],
  exports: [ImportService, AdapterFactory],
})
export class ImportModule {}
