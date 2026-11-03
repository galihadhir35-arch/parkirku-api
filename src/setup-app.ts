import type { INestApplication } from '@nestjs/common';
import { ProblemDetailsFilter } from './common/filters/problem-details.filter';
import { ApiValidationPipe } from './common/pipes/api-validation.pipe';

/**
 * Konfigurasi global yang dipakai oleh main.ts dan e2e test,
 * agar perilaku aplikasi saat diuji sama dengan saat dijalankan.
 */
export function setupApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ApiValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter());
}
