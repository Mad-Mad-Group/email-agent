import {
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permission } from '../common/decorators/permission.decorator';

@ApiTags('Scraper 資料擷取')
@ApiBearerAuth()
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ScraperController {
  constructor(private readonly scraper: ScraperService) {}

  @Post(':id/scrape')
  @HttpCode(200)
  @Permission('scraper.run')
  async scrape(@Param('id') id: string) {
    return this.scraper.enrich(id);
  }
}
