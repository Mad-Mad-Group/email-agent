import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('通知')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  /** GET /notifications?read=false&limit=50&page=1 */
  @Get()
  async list(
    @Query('read') read?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.svc.findAll({
      read: read === undefined ? undefined : read === 'true',
      limit: limit ? +limit : undefined,
      page: page ? +page : undefined,
    });
  }

  /** GET /notifications/unread-count */
  @Get('unread-count')
  async unreadCount() {
    const count = await this.svc.unreadCount();
    return { unread_count: count };
  }

  /** PATCH /notifications/:id/read */
  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    const doc = await this.svc.markRead(id);
    return doc ?? { id };
  }

  /** POST /notifications/mark-all-read */
  @Post('mark-all-read')
  async markAllRead() {
    const count = await this.svc.markAllRead();
    return { marked: count };
  }
}
