import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

/**
 * CORS allow-list (strict dev mode).
 *   - localhost (本人自己 browse 自己 Mac)
 *   - 192.168.x.x subnet (office同事 browse http://192.168.1.111:5173)
 *   - 10.x.x.x subnet (部分公司用 Class A 私網)
 *
 * 加 entry: pushing 到 .env.example, CORS_ORIGIN 用 JSON array string,
 * 比單一 URL 更 flex,亦避免誤用 'true'。
 */
const STATIC_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:4173',   // vite preview
  'https://localhost:4173',
];

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,   // office LAN
  /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/, // Class A 私網
];

function isOriginAllowed(origin: string | undefined, extra: string[]): boolean {
  if (!origin) return true; // server-to-server / curl / mobile app 等冇 origin
  if (STATIC_ALLOWED_ORIGINS.includes(origin)) return true;
  if (ALLOWED_ORIGIN_PATTERNS.some((rx) => rx.test(origin))) return true;
  if (extra.includes(origin)) return true;
  return false;
}

function readExtraCorsOrigins(): string[] {
  // CORS_ORIGIN=url1,url2,url3 (逗號分隔,不需要 JSON brackets)
  // Empty 或 missing 即可。設定 '__strict__' = 拒絕所有 office 之外 origin (生產模式)
  const raw = process.env.CORS_ORIGIN ?? '';
  if (!raw) return [];
  if (raw === '__strict__') {
    // production 模式: 完全關 office subnet, 只保留 static
    ALLOWED_ORIGIN_PATTERNS.length = 0;
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const extraOrigins = readExtraCorsOrigins();

  // Helmet: dev 模式關 CSP 讓 Swagger 載到, CORP 放 cross-origin 讓 token response 可以讀到
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, extraOrigins)) {
        return callback(null, true);
      }
      console.warn(`[CORS] blocked origin: ${origin ?? '(none)'}`);
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger API 文件
  const config = new DocumentBuilder()
    .setTitle('Lead Scraper CMS API')
    .setDescription('搵客系統 CMS 後端 API 文件')
    .setVersion('1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[CMS] Server running on http://localhost:${port}`);
  console.log(`[CMS] CORS allow-list:`);
  for (const o of STATIC_ALLOWED_ORIGINS) console.log(`        - ${o}`);
  for (const rx of ALLOWED_ORIGIN_PATTERNS) console.log(`        - ${rx}`);
  for (const e of extraOrigins) console.log(`        - ${e}`);
  console.log(`[CMS] Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
