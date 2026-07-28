import {
  Body,
  Controller,
  Get,
  Param,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StartDto } from './dto/start.dto';
import { CallbackDto } from './dto/callback.dto';
import { TestEmailDto } from './dto/test-email.dto';
import { SUPPORTED_PROVIDERS, SupportedProvider } from './schemas/user-credential.schema';
import { UserCredentialsService } from './user-credentials.service';

/**
 * Unified per-user email-connection endpoints (simplified).
 *
 *   POST  /auth/email/:provider/start          (auth required)
 *   GET   /auth/email/:provider/callback       (no auth; called by provider redirect)
 *   GET   /auth/email/status                   (auth required)
 *   POST  /auth/email/test-email               (auth required)
 *   POST  /auth/email/revoke                   (auth required)
 *   GET   /auth/email/providers                (auth required; returns provider catalogue)
 *
 * Only OAuth2 is supported — no username / app-password / SMTP password
 * ever enters the system. SMTP/IMAP hosts are constants derived per
 * provider in the service; the user only clicks "Connect" on the
 * frontend, consents with Google/Microsoft, and is linked.
 */
@ApiTags('User Email Connection')
@ApiBearerAuth('jwt')
@Controller('auth/email')
export class UserCredentialsController {
  constructor(private readonly svc: UserCredentialsService) {}

  @Post(':provider/start')
  @ApiOperation({ summary: '產生 OAuth 同意畫面 URL (Gmail / Outlook)' })
  @ApiResponse({ status: 200, description: 'consent URL + state nonce' })
  async start(
    @Param('provider') provider: string,
    @CurrentUser() u: any,
    @Body() dto: StartDto,
  ) {
    const p = this.assertProvider(provider);
    const { url, state } = await this.svc.startOAuth(u.user_id, p, dto.returnTo);
    return { status: 'success', data: { url, state } };
  }

  @Get(':provider/callback')
  @ApiOperation({ summary: 'Provider OAuth callback' })
  @ApiResponse({ status: 200, description: 'Connected; returns user email + redirect path' })
  async callback(@Param('provider') provider: string, @Query() q: CallbackDto) {
    if (q.error) throw new Error(`provider returned error: ${q.error}`);
    const p = this.assertProvider(provider);
    const result = await this.svc.handleCallback(q.code, q.state);
    return { status: 'success', data: result };
  }

  @Get('status')
  @ApiOperation({ summary: '查當前 user Email 連接狀態' })
  async status(@CurrentUser() u: any) {
    return { status: 'success', data: await this.svc.getStatus(u.user_id) };
  }

  @Post('test-email')
  @ApiOperation({ summary: '以當前 user 身份寄 1 封 test email' })
  async testEmail(@CurrentUser() u: any, @Body() dto: TestEmailDto) {
    const info = await this.svc.sendMailAsUser(u.user_id, {
      to: dto.to,
      subject: 'ClientRadar — Test Email',
      html: `<p>This is a test email from your ClientRadar account. If you received this, your ${u.role ?? 'user'} connection works.</p>`,
    });
    return { status: 'success', data: { messageId: info.messageId } };
  }

  @Post('revoke')
  @ApiOperation({ summary: '主動斷開 Email 連接' })
  async revoke(@CurrentUser() u: any) {
    await this.svc.revoke(u.user_id);
    return { status: 'success', data: { revoked: true } };
  }

  @Get('providers')
  @ApiOperation({ summary: '列出支援嘅 provider (含 enabled 與否)' })
  providers() {
    return { status: 'success', data: this.svc.listProviders() };
  }

  private assertProvider(p: string): SupportedProvider {
    if (!(SUPPORTED_PROVIDERS as readonly string[]).includes(p)) {
      throw new Error(`unsupported provider: ${p}; supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
    }
    return p as SupportedProvider;
  }
}
