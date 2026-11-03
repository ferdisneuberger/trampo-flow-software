import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './infrastructure/http/filters/domain-exception.filter';

const DOCS_PATH = 'docs';

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

// O Swagger UI carrega CSS, JS e um script inline de inicialização. A política
// restritiva acima bloquearia a página inteira, então ela é aliviada apenas
// nas rotas de documentação.
const docsSecurityHeaders = {
  ...securityHeaders,
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
  ].join('; '),
};

function isDocsRequest(url: string): boolean {
  const path = url.split('?')[0] ?? '';

  return (
    path === `/${DOCS_PATH}` ||
    path.startsWith(`/${DOCS_PATH}/`) ||
    path === `/${DOCS_PATH}-json` ||
    path === `/${DOCS_PATH}-yaml`
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    }),
  );

  await app.register(fastifyCookie);
  await app.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  });

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 3000);
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.headers(
      isDocsRequest(request.url) ? docsSecurityHeaders : securityHeaders,
    );

    return payload;
  });

  const defaultCorsOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://app.example.com',
  ];

  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : defaultCorsOrigins,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trampo Flow API')
    .setDescription(
      'API de acompanhamento de candidaturas. Todas as rotas, exceto login, health e documentação, exigem um token JWT.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addTag('applications', 'Candidaturas e arquivos anexados')
    .addTag('auth', 'Autenticação e perfil')
    .addTag('health', 'Disponibilidade da API')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(DOCS_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen({
    port,
    host: '0.0.0.0',
  });
}

void bootstrap();
