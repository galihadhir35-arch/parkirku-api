import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Slot } from '../slots/slot.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

/**
 * Opsi koneksi dipakai oleh TypeORM CLI (migration/seed).
 * Jangan hardcode kredensial: semua dibaca dari environment/.env.
 */
export function buildDataSourceOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST ?? 'localhost',
    port: Number(env.DB_PORT ?? 5432),
    username: env.DB_USER ?? 'parkirku',
    password: env.DB_PASSWORD ?? 'parkirku',
    database: env.DB_NAME ?? 'parkirku',
    entities: [Vehicle, Slot, Ticket],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: false,
    logging: false,
  };
}

const AppDataSource = new DataSource(buildDataSourceOptions());

export default AppDataSource;
