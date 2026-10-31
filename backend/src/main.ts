import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './infrastructure/http/filters/domain-exception.filter';

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy':
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? 3000);
  const fastify = app.getHttpAdapter().getInstance();

  fastify.addHook('onSend', async (_request, reply, payload) => {
    reply.headers(securityHeaders);

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

  await app.listen({
    port,
    host: '0.0.0.0',
  });
}

void bootstrap();
