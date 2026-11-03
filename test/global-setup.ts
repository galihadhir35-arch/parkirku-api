import './test-env';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/data-source';

/**
 * Menyiapkan database test sekali sebelum seluruh suite berjalan:
 * 1. membuat database test jika belum ada,
 * 2. menjalankan semua migration.
 */
export default async function globalSetup(): Promise<void> {
  const options = buildDataSourceOptions();

  if (options.type !== 'postgres') {
    throw new Error('Test hanya mendukung PostgreSQL.');
  }

  const database = options.database ?? 'parkirku_test';
  const admin = new Client({
    host: options.host,
    port: options.port,
    user: options.username,
    password: options.password,
    database: 'postgres',
  });

  await admin.connect();

  try {
    const exists = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );

    if (exists.rowCount === 0) {
      const safeName = database.replace(/"/g, '""');
      await admin.query(`CREATE DATABASE "${safeName}"`);
    }
  } finally {
    await admin.end();
  }

  const dataSource = new DataSource(options);

  await dataSource.initialize();

  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}
