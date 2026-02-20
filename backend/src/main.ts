import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  });

  app.setGlobalPrefix('api/v1');
  app.use(RequestContextMiddleware);

  await app.listen(3000);
}

bootstrap();
