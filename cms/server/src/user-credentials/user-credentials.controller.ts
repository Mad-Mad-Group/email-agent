import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StartDto } from './dto/start.dto';
import { CallbackDto } from './dto/callback.dto';
import { TestEmailDto } from './dto/test-email.dto';
import { UserCredentialsService } from './user-credentials.service';

@ApiTags('User Email OAuth')
@ApiBearerAuth('jwt')
@Controller('auth/google')
@UseGuards(JwtAuthGuard)
export class UserCredentialsController {
  constructor(
    private readonly svc: UserCredentialsService,
    private readonly cfg: ConfigService,
  ) {}

  @Post('start')
  @ApiOperation({
    summary: '產生 Google OAuth 同意畫面 URL',
    description: '前端拿這條 URL 用 window.location.assign() 帶 user 跳轉去 Google。',
  })
  @ApiResponse({ status: 200, description: '回傳 consent URL + state nonce' })
  async start(@CurrentUser() u: any, @Body() dto: StartDto) {
    const { url, state } = await this.svc.startOAuth(u.user_id, dto.returnTo);
    return { status: 'success', data: { url, state } };
  }

  @Get('callback')
  @ApiOperation({
    summary: 'Google OAuth callback(由 Google 跳轉)',
    description:
      'Google 帶 ?code=...&state=... 跳返此 endpoint。內部交換 token + save encrypted refresh,然後 302 跳返 returnTo。',
  })
  @ApiResponse({ status: 302, description: 'Redirect to returnTo' })
  @ApiResponse({ status: 400, description: 'invalid_state / no_refresh_token' })
  async callback(@Query() q: CallbackDto) {
    const result = await this.svc.handleCallback(q.code, q.state);
    return { status: 'success', data: result };
  }

  @Get('status')
  @ApiOperation({ summary: '查當前 user Gmail 連接狀態' })
  async status(@CurrentUser() u: any) {
    return { status: 'success', data: await this.svc.getStatus(u.user_id) };
  }

  @Post('test-email')
  @ApiOperation({
    summary: '以當前 user 身份寄 1 封 test email (用嚟試 OAuth + SMTP 真 work)',
  })
  @ApiResponse({ status: 200, description: '送出成功,回傳 messageId' })
  async testEmail(@CurrentUser() u: any, @Body() dto: TestEmailDto) {
    const info = await this.svc.sendMailAsUser(u.user_id, {
      to: dto.to,
      subject: 'ClientRadar — Test Email',
      html: `<p>Hi ${u.name ?? u.email_address ?? 'there'},</p>
             <p>This is a test email from your ClientRadar account.</p>
             <p>If you received this, your Gmail is correctly connected.</p>`,
    });
    return { status: 'success', data: { messageId: info.messageId } };
  }

  @Post('revoke')
  @ApiOperation({ summary: '主動斷開 Gmail 連接(revoke at Google + 清除 DB)' })
  async revoke(@CurrentUser() u: any) {
    await this.svc.revoke(u.user_id);
    return { status: 'success', data: { revoked: true } };
  }
}
