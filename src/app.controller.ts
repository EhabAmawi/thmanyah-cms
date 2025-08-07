import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { PublicRateLimit } from './common/decorators/throttle-config.decorator';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @PublicRateLimit()
  @ApiOperation({ summary: 'Get application welcome message' })
  @ApiResponse({
    status: 200,
    description: 'Welcome message returned successfully',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
