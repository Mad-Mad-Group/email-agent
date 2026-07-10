import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { EmailQueueService } from './email-queue.service';
import { ListEmailQueueQueryDto } from './dto/list-email-queue-query.dto';
import { EditEmailDto } from './dto/edit-email.dto';
import { RejectEmailDto } from './dto/reject-email.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/decorators/permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser {
  userId: string;
  role: string;
}
function isAdmin(u: JwtUser): boolean {
  return u.role === 'admin' || u.role === 'super_admin';
}

@ApiTags('Email Queue 郵件審批')
@ApiBearerAuth()
@Controller('email-queue')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EmailQueueController {
  constructor(private readonly svc: EmailQueueService) {}

  @Get()
  @Permission('emails.view')
  async list(@Query() q: ListEmailQueueQueryDto, @CurrentUser() user: JwtUser) {
    return this.svc.findAll(q, isAdmin(user) ? undefined : user.userId);
  }

  @Get(':id')
  @Permission('emails.view')
  async get(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @Permission('emails.edit')
  async edit(@Param('id') id: string, @Body() dto: EditEmailDto) {
    return this.svc.edit(id, dto);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @Permission('emails.approve')
  async approve(@Param('id') id: string) {
    return this.svc.approve(id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @Permission('emails.approve')
  async reject(@Param('id') id: string, @Body() dto: RejectEmailDto) {
    return this.svc.reject(id, dto);
  }

  @Post(':id/send')
  @HttpCode(200)
  @Permission('emails.send')
  async send(@Param('id') id: string) {
    return this.svc.send(id);
  }
}
