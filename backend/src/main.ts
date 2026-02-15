import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(RequestContextMiddleware);

  await app.listen(3000);
}

bootstrap();
