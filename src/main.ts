import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.setGlobalPrefix(`/api/${process.env.API_VERSION ?? 'v1'}`);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '127.0.0.1');
}
await bootstrap();
