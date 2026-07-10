"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_interceptor_1 = require("./common/interceptors/response.interceptor");
const STATIC_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://localhost:5173',
    'http://localhost:4173',
    'https://localhost:4173',
];
const ALLOWED_ORIGIN_PATTERNS = [
    /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
    /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/,
];
function isOriginAllowed(origin, extra) {
    if (!origin)
        return true;
    if (STATIC_ALLOWED_ORIGINS.includes(origin))
        return true;
    if (ALLOWED_ORIGIN_PATTERNS.some((rx) => rx.test(origin)))
        return true;
    if (extra.includes(origin))
        return true;
    return false;
}
function readExtraCorsOrigins() {
    const raw = process.env.CORS_ORIGIN ?? '';
    if (!raw)
        return [];
    if (raw === '__strict__') {
        ALLOWED_ORIGIN_PATTERNS.length = 0;
        return [];
    }
    return raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const extraOrigins = readExtraCorsOrigins();
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }));
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
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Lead Scraper CMS API')
        .setDescription('搵客系統 CMS 後端 API 文件')
        .setVersion('1')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`[CMS] Server running on http://localhost:${port}`);
    console.log(`[CMS] CORS allow-list:`);
    for (const o of STATIC_ALLOWED_ORIGINS)
        console.log(`        - ${o}`);
    for (const rx of ALLOWED_ORIGIN_PATTERNS)
        console.log(`        - ${rx}`);
    for (const e of extraOrigins)
        console.log(`        - ${e}`);
    console.log(`[CMS] Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map