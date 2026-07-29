import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

interface JwtUser { userId: string; email: string; role: string; permissions: string[]; }

@ApiTags('Search 搜尋')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly users: UsersService,
  ) {}

  @Post()
  @HttpCode(200)
  async run(@Body() dto: SearchDto, @CurrentUser() user: JwtUser) {
    const smtpOk = await this.users.hasSmtpConfigured(user.userId);
    if (!smtpOk) {
      throw new BadRequestException(
        'SMTP 未設定。請先到 Settings → Email SMTP 設定你的郵件伺服器。',
      );
    }
    return this.search.run(dto, user.userId);
  }
}
