import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module';

export function buildSwaggerConfig(): ReturnType<DocumentBuilder['build']> {
  return new DocumentBuilder()
    .setTitle('ParkirKu API')
    .setDescription(
      'REST API manajemen parkir: kendaraan, slot, dan tiket check-in/check-out.',
    )
    .setVersion('2.0.0')
    .addTag('vehicles', 'Operasi kendaraan (dengan ETag/If-Match)')
    .addTag('slots', 'Operasi slot parkir')
    .addTag('tickets', 'Check-in dan check-out tiket')
    .build();
}

export function setupSwagger(app: INestApplication): void {
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}

export async function createOpenApiDocument() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
  await app.close();
  return document;
}
