import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Mobile clients compare their build version against these; set via env, defaults keep old builds working.
  @Get('api/v1/app/version')
  appVersion(): Record<string, string> {
    return {
      minVersion: process.env.MOBILE_MIN_VERSION || '1.0.0',
      latestVersion: process.env.MOBILE_LATEST_VERSION || '1.0.0',
    };
  }

  @Get('health')
  health(): Record<string, string> {
    this.appService.getHello();
    return { status: 'ok' };
  }
}
