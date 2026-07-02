import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@ApiTags('Health 健康檢查')
@Controller()
export class AppController {
  constructor(@InjectConnection() private readonly db: Connection) {}

  @Get('health')
  health() {
    const dbState = this.db.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';
    return {
      server: 'ok',
      db: dbStatus,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
