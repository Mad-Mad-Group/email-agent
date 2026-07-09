import {
  Controller,
  Delete,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

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
    @CurrentUser() user?: JwtUser,
  ) {
    return this.svc.findAll({
      read: read === undefined ? undefined : read === 'true',
      limit: limit ? +limit : undefined,
      page: page ? +page : undefined,
      userId: user?.userId,
    });
  }

  /** GET /notifications/unread-count */
  @Get('unread-count')
  async unreadCount(@CurrentUser() user?: JwtUser) {
    const count = await this.svc.unreadCount(user?.userId);
    return { unread_count: count };
  }

  /** PATCH /notifications/:id/read */
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    const doc = await this.svc.markRead(id, user?.userId);
    return doc ?? { id };
  }

  /** POST /notifications/mark-all-read */
  @Post('mark-all-read')
  async markAllRead(@CurrentUser() user?: JwtUser) {
    const count = await this.svc.markAllRead(user?.userId);
    return { marked: count };
  }

  /** DELETE /notifications/:id — 隱藏單條（前端顯示為刪除） */
  @Delete(':id')
  async dismiss(@Param('id') id: string, @CurrentUser() user?: JwtUser) {
    await this.svc.dismiss(id, user?.userId);
    return { dismissed: id };
  }

  /** POST /notifications/dismiss-all — 隱藏全部 */
  @Post('dismiss-all')
  async dismissAll(@CurrentUser() user?: JwtUser) {
    const count = await this.svc.dismissAll(user?.userId);
    return { dismissed: count };
  }
}
