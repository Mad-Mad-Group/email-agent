import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { VerifiedEmailsService } from './verified-emails.service';
import { CreateVerifiedEmailDto, ListVerifiedEmailsQueryDto } from './dto/verified-email.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
}

@ApiTags('Verified Emails 共用池')
@ApiBearerAuth()
@Controller('verified-emails')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerifiedEmailsController {
  constructor(private readonly service: VerifiedEmailsService) {}

  @Get()
  async list(@Query() query: ListVerifiedEmailsQueryDto) {
    return this.service.findAll(query);
  }

  @Get('stats')
  async stats() {
    return this.service.stats();
  }

  /** 用 company_name 匹配 verified pool */
  @Get('match')
  async match(@Query('company') company: string) {
    const results = await this.service.matchByCompany(company);
    return results;
  }

  @Post()
  async create(@Body() dto: CreateVerifiedEmailDto, @CurrentUser() user: JwtUser) {
    return this.service.createManual(dto, user.userId);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { deleted: id };
  }

  /** CSV 匯出 */
  @Get('export')
  async exportCsv(@Res() res: Response) {
    const data = await this.service.exportAll();
    const header = 'email,company_name,domain,verification_method,reply_count,match_count,created_at\n';
    const rows = data.map((d: any) =>
      [d.email, d.company_name, d.domain, d.verification_method, d.reply_count, d.match_count, d.created_at].join(','),
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=verified-emails.csv');
    res.send(header + rows);
  }
}
