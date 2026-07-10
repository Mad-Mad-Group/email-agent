import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser { userId: string; role: string; }

/* ── 通知偏好（所有登入用戶都可用） ── */
@ApiTags('Users 通知偏好')
@ApiBearerAuth()
@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UserPrefsController {
  constructor(private readonly usersService: UsersService) {}

  @Get('notification-prefs')
  async getNotificationPrefs(@CurrentUser() user: JwtUser) {
    const u = await this.usersService.findById(user.userId);
    if (!u) throw new NotFoundException('User not found');
    return (u as any).notification_prefs ?? { email_on_complete: false, browser_on_complete: false };
  }

  @Patch('notification-prefs')
  async updateNotificationPrefs(
    @CurrentUser() user: JwtUser,
    @Body() body: { email_on_complete?: boolean; browser_on_complete?: boolean },
  ) {
    return this.usersService.updateNotificationPrefs(user.userId, body);
  }
}

@ApiTags('Users 用戶管理')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.usersService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
