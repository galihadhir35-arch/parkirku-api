# Laporan Pengujian ParkirKu

## Tujuan
Memastikan kontrak API ParkirKu (CRUD kendaraan/slot, check-in/check-out, ETag, transaksi, dan error handling) berjalan sesuai spesifikasi.

## Cakupan
- Unit: perhitungan tarif (`src/tickets/ticket-fee.spec.ts`) dan service kendaraan dengan repository di-mock (`test/unit/vehicles.service.spec.ts`).
- Integration: constraint database PostgreSQL (`test/integration/db.integration.spec.ts`).
- E2E: seluruh endpoint via Supertest terhadap aplikasi NestJS penuh + database test (`test/parkirku.e2e-spec.ts`).

## Hasil
- `npm run test:unit`: 2 suite, 5 test lulus.
- `npm run test:integration`: 1 suite, 1 test lulus.
- `npm run test:e2e`: 1 suite, 15 test lulus.
- `npm test` (gabungan): 4 suite, 21 test lulus.
- Coverage: lihat `npm run test:cov`.

## Kendala
- Docker tidak tersedia di mesin pengembang; PostgreSQL portable 16.15 dipakai di port 55432.
- Postman collection dijalankan dengan `npm run test:newman` terhadap server lokal.
