import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';
import { setupSwagger } from './swagger/openapi';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  setupApp(app);
  setupSwagger(app);

  const port = Number(process.env.PORT ?? 3000);

  await app.listen(port);

  Logger.log(
    `ParkirKu API berjalan di http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
  Logger.log(
    `Swagger UI tersedia di http://localhost:${port}/docs`,
    'Bootstrap',
  );
}

void bootstrap();
