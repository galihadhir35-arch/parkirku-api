import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { setupApp } from '../../src/setup-app';

describe('Database integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "tickets", "slots", "vehicles" RESTART IDENTITY CASCADE',
    );
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE TABLE "tickets", "slots", "vehicles" RESTART IDENTITY CASCADE',
    );
  });

  it('menyimpan kendaraan dan menolak plat duplikat di level database', async () => {
    await dataSource.query(
      `INSERT INTO "vehicles" ("plate_number", "type", "owner_name")
       VALUES ('B 1001 XY', 'CAR', 'Budi')`,
    );

    let error: { code?: string } | undefined;
    try {
      await dataSource.query(
        `INSERT INTO "vehicles" ("plate_number", "type", "owner_name")
         VALUES ('B 1001 XY', 'CAR', 'Budi')`,
      );
    } catch (caught) {
      error = caught as { code?: string };
    }

    expect(error?.code).toBe('23505');
  });
});
