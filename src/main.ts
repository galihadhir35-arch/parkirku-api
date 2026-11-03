import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);

  Logger.log(
    `ParkirKu API berjalan di http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
}

void bootstrap();
