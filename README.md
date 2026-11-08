# ParkirKu API

REST API manajemen parkir menggunakan **NestJS (TypeScript)** dan **PostgreSQL + TypeORM**. Project ini merupakan implementasi rancangan kontrak API (Tugas 1 sampai 4) berupa aplikasi REST API NestJS dengan penyimpanan permanen di PostgreSQL, migration, transaksi database, seed, serta **ETag/If-Match** untuk resource kendaraan.

Kontrak API (URL, nama field, status code, dan format Problem Details) tidak berubah dari Tahap 1.

## Teknologi

- NestJS 11 + TypeScript
- TypeORM 0.3 + driver `pg`
- PostgreSQL 16
- class-validator & class-transformer
- Jest + Supertest (e2e memakai database PostgreSQL sungguhan)

## Persiapan

Prasyarat: **Node.js 20+**, **npm**, dan **PostgreSQL 16** (lewat Docker atau instalasi lokal).

```bash
npm install
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
```

Sesuaikan kredensial di `.env` bila perlu:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=parkirku
DB_PASSWORD=parkirku
DB_NAME=parkirku
DB_NAME_TEST=parkirku_test
```

## Menjalankan PostgreSQL

Cara termudah memakai Docker Compose (PostgreSQL 16):

```bash
docker compose up -d
docker compose ps          # pastikan status healthy
```

`docker-compose.yml` membaca `DB_NAME`, `DB_USER`, `DB_PASSWORD`, dan `DB_PORT` dari `.env`, sehingga kredensial aplikasi dan container selalu sama. Data disimpan di volume `parkirku_pgdata`.

Jika memakai PostgreSQL lokal, buat database dan role sesuai isi `.env`, lalu lanjut ke langkah migrasi.

## Migrasi database

Skema **tidak** dibuat otomatis (`synchronize: false`). Semua perubahan skema lewat migration.

```bash
npm run migration:run       # menjalankan migration yang belum dieksekusi
npm run migration:revert    # membatalkan migration terakhir
npm run migration:generate -- src/database/migrations/NamaPerubahan
```

Migration awal ada di `src/database/migrations/` dan membuat:

- enum `vehicle_type`, `slot_status`, `ticket_status`;
- tabel `vehicles`, `slots`, `tickets` beserta primary key, unique, foreign key, dan check constraint;
- partial unique index `uq_tickets_active_vehicle` dan `uq_tickets_active_slot` (satu tiket `ACTIVE` per kendaraan/slot);
- index `idx_tickets_entry_time_id` untuk pengurutan cursor tiket.

## Seed data contoh

```bash
npm run seed
```

Seed bersifat idempotent (data dicek berdasarkan `plateNumber`/`code` sebelum insert) dan menambahkan 3 kendaraan serta 4 slot contoh.

## Menjalankan aplikasi

```bash
# mode development (watch)
npm run start:dev

# mode biasa
npm run start

# hasil build
npm run build
npm run start:prod
```

Server berjalan di `http://localhost:3000` dengan base path **`/api/v1`**. Port dapat diubah lewat `PORT` di `.env`.

## Script npm

| Script | Fungsi |
|---|---|
| `npm run start:dev` | Menjalankan server dengan watch mode |
| `npm run build` | Compile TypeScript ke folder `dist/` |
| `npm run start:prod` | Menjalankan hasil build (`dist/main`) |
| `npm run typeorm` | Menjalankan TypeORM CLI dengan `src/database/data-source.ts` |
| `npm run migration:run` | Menjalankan migration |
| `npm run migration:revert` | Membatalkan migration terakhir |
| `npm run migration:generate -- <path>` | Membuat migration dari selisih entity vs database |
| `npm run seed` | Mengisi data contoh |
| `npm test` | Menjalankan seluruh unit test dan e2e test |
| `npm run test:e2e` | Menjalankan e2e test (Supertest) |
| `npm run test:cov` | Menjalankan test + laporan coverage |

## Struktur folder

```text
ParkirKu/
├── src/
│   ├── main.ts                         # bootstrap + port
│   ├── setup-app.ts                    # global prefix, pipe, filter (dipakai test juga)
│   ├── app.module.ts                   # ConfigModule + TypeOrmModule
│   ├── common/
│   │   ├── enums.ts                    # VehicleType, SlotStatus, TicketStatus
│   │   ├── errors/problem-details.ts   # exception + factory Problem Details
│   │   ├── filters/problem-details.filter.ts  # termasuk mapping error PostgreSQL
│   │   ├── pipes/api-validation.pipe.ts
│   │   └── utils/                      # cursor, etag, pagination, sort
│   ├── database/
│   │   ├── data-source.ts              # DataSource untuk TypeORM CLI & test
│   │   ├── database.config.ts          # opsi koneksi untuk AppModule
│   │   ├── seed.ts
│   │   └── migrations/                 # migration SQL
│   ├── vehicles/
│   │   ├── dto/
│   │   ├── vehicle.entity.ts
│   │   ├── vehicles.controller.ts
│   │   ├── vehicles.module.ts
│   │   ├── vehicles.repository.ts
│   │   └── vehicles.service.ts
│   ├── slots/
│   │   ├── dto/
│   │   ├── slot.entity.ts
│   │   ├── slots.controller.ts
│   │   ├── slots.module.ts
│   │   ├── slots.repository.ts
│   │   └── slots.service.ts
│   └── tickets/
│       ├── dto/
│       ├── ticket.entity.ts
│       ├── ticket-fee.ts               # perhitungan tarif
│       ├── tickets.controller.ts
│       ├── tickets.module.ts
│       ├── tickets.repository.ts
│       └── tickets.service.ts
├── test/
│   ├── global-setup.ts                 # buat DB test + jalankan migration
│   ├── test-env.ts                     # arahkan DB_NAME ke database test
│   └── parkirku.e2e-spec.ts
├── docker-compose.yml
├── .env.example
└── README.md
```

Setiap resource memisahkan tanggung jawab:

- **Controller** menangani routing, parsing parameter, status code, header `Location`/`ETag`.
- **Service** berisi aturan bisnis, transaksi, dan pemetaan response.
- **Repository** satu-satunya lapisan yang mengakses database melalui TypeORM.
- **DTO** menangani validasi input dengan `class-validator`.

## Skema database

| Tabel | Kolom penting | Constraint |
|---|---|---|
| `vehicles` | `id`, `plate_number`, `type`, `owner_name`, `created_at`, `version` | PK, `plate_number` unik, panjang plat 1–12, panjang nama 2–100 |
| `slots` | `id`, `code`, `floor`, `type`, `status` | PK, `code` unik, panjang kode 1–20, `floor >= 1` |
| `tickets` | `id`, `vehicle_id`, `slot_id`, `entry_time`, `exit_time`, `fee`, `status` | PK, FK ke `vehicles`/`slots`, `fee >= 0`, konsistensi `status`/`exit_time`/`fee` |

Constraint tambahan:

- `uq_tickets_active_vehicle` — partial unique index: maksimal satu tiket `ACTIVE` per kendaraan.
- `uq_tickets_active_slot` — partial unique index: maksimal satu tiket `ACTIVE` per slot.
- `fk_tickets_vehicle` memakai `ON DELETE CASCADE`; `fk_tickets_slot` memakai `ON DELETE RESTRICT`.

## Endpoint

Semua URL diawali `/api/v1`.

| Method | URL | Fungsi | Sukses | Error |
|---|---|---|---|---|
| GET | `/vehicles` | Daftar kendaraan (`page`, `limit`, `type`, `q`, `sort`) | 200 | 400 |
| POST | `/vehicles` | Daftar kendaraan baru | 201 + `Location` | 400, 409 |
| GET | `/vehicles/{id}` | Detail kendaraan + `ETag` | 200 / 304 | 404 |
| PUT | `/vehicles/{id}` | Ganti seluruh data kendaraan | 200 + `ETag` | 400, 404, 409, 412, 428 |
| PATCH | `/vehicles/{id}` | Ubah sebagian data kendaraan | 200 + `ETag` | 400, 404, 409, 412, 428 |
| DELETE | `/vehicles/{id}` | Hapus kendaraan | 204 | 404, 409, 412, 428 |
| GET | `/slots` | Daftar slot (`status`, `type`, `floor`, `sort`, `page`, `limit`) | 200 | 400 |
| GET | `/slots/{id}` | Detail slot | 200 | 404 |
| POST | `/slots` | Tambah slot | 201 + `Location` | 400, 409 |
| PATCH | `/slots/{id}` | Ubah status/data slot | 200 | 400, 404, 409 |
| POST | `/tickets` | Check-in | 201 + `Location` | 400, 404, 409 |
| GET | `/tickets` | Daftar tiket (`status`, `vehicleId`, `from`, `to`, `sort`, `limit`, `cursor`) | 200 | 400 |
| GET | `/tickets/{id}` | Detail tiket | 200 | 404 |
| PATCH | `/tickets/{id}` | Check-out (`{ "status": "COMPLETED" }`) | 200 | 400, 404, 409 |

### Pagination, sorting, filtering

- **Vehicles & slots** memakai offset: `page` (mulai 1), `limit` (default 10, maks 100).
  Response: `{ "data": [...], "meta": { "page", "limit", "totalItems", "totalPages" } }`.
- **Tickets** memakai cursor: `limit` (default 10, maks 100), `cursor` (base64 dari `{"t": entryTime, "id": id}`).
  Response: `{ "data": [...], "meta": { "limit", "nextCursor" } }`.
  Cursor hanya dapat dipakai tanpa parameter `sort` (pengurutan cursor selalu `entryTime DESC, id DESC`).
- `sort` berupa daftar field dipisah koma; awalan `-` berarti descending. `id` selalu dipakai sebagai tie-breaker.
  - vehicles: `plateNumber`, `createdAt`
  - slots: `code`, `floor`
  - tickets: `entryTime`, `fee`
- `from`/`to` pada tickets memakai format ISO 8601. Jika `to` hanya berisi tanggal (`YYYY-MM-DD`), seluruh hari tersebut ikut dihitung.
- Parameter query yang tidak dikenal, nilai di luar aturan, atau field sort di luar whitelist menghasilkan **400 `invalid-query`**.

### ETag dan If-Match (vehicles)

Setiap kendaraan memiliki kolom `version` yang dinaikkan otomatis oleh TypeORM setiap kali data berubah.

1. `GET /vehicles/{id}` mengembalikan header `ETag: "v<version>"` (contoh `"v1"`).
2. Kirim `If-None-Match: "v1"` untuk mendapatkan **304 Not Modified** bila data belum berubah.
3. `PUT`, `PATCH`, dan `DELETE` **wajib** mengirim `If-Match`:
   - header tidak dikirim → **428 Precondition Required**;
   - nilai tidak cocok (data sudah berubah) → **412 Precondition Failed**.
4. `PUT`/`PATCH` yang berhasil mengembalikan `ETag` baru, misalnya `"v2"` lalu `"v3"`.

`If-Match`/`If-None-Match` boleh berisi beberapa ETag dipisah koma; weak ETag (`W/"v1"`) juga diterima.

```bash
# 1. Ambil ETag
curl -i http://localhost:3000/api/v1/vehicles/1

# 2. Ubah dengan If-Match
curl -i -X PATCH http://localhost:3000/api/v1/vehicles/1 \
  -H "Content-Type: application/json" \
  -H 'If-Match: "v1"' \
  -d '{"ownerName":"Budi Santoso Baru"}'
```

### Format error

Semua error memiliki header `Content-Type: application/problem+json` dan body Problem Details:

```json
{
  "type": "https://api.parkirku.example/problems/duplicate-plate",
  "title": "Plat nomor sudah terdaftar",
  "status": 409,
  "detail": "Kendaraan dengan plat nomor B 1001 XY sudah terdaftar.",
  "instance": "/api/v1/vehicles"
}
```

Validasi gagal (400) menambahkan array `errors`:

```json
{
  "type": "https://api.parkirku.example/problems/validation-error",
  "title": "Data tidak valid",
  "status": 400,
  "detail": "Satu atau lebih field tidak memenuhi aturan validasi.",
  "instance": "/api/v1/vehicles",
  "errors": [
    { "field": "plateNumber", "message": "plateNumber tidak boleh kosong" },
    { "field": "type", "message": "type harus CAR atau MOTORCYCLE" }
  ]
}
```

Nilai `type` yang dipakai: `validation-error`, `invalid-query`, `not-found`, `duplicate-plate`, `duplicate-slot-code`, `slot-occupied`, `vehicle-in-use`, `ticket-already-completed`, `precondition-required`, `precondition-failed`, `internal-error`.

Error PostgreSQL dipetakan di global filter tanpa membocorkan detail SQL:

| Kode | Arti | Response |
|---|---|---|
| `23505` | unique violation | 409 sesuai constraint (`duplicate-plate`, `duplicate-slot-code`, `vehicle-in-use`, `slot-occupied`) |
| `23503` | foreign key violation | 404 (referensi tidak ada) atau 409 (data masih dipakai) |
| `23502` | not-null violation | 400 `validation-error` dengan field terkait |
| `23514` | check violation | 400 `validation-error` |
| `22P02` | format data tidak valid | 400 `validation-error` |
| lainnya | error tak terduga | 500 `internal-error` (detail hanya masuk log) |

### Aturan bisnis yang sudah diterapkan

1. Check-in hanya untuk slot `AVAILABLE` dengan tipe yang sama dengan kendaraan (409 jika gagal).
2. Satu kendaraan hanya boleh memiliki satu tiket `ACTIVE` (409, dijaga service dan partial unique index).
3. Check-in dan check-out berjalan dalam **satu transaksi database**:
   - check-in mengunci baris slot dengan `SELECT ... FOR UPDATE` (`pessimistic_write`), membuat tiket `ACTIVE`, lalu mengubah slot menjadi `OCCUPIED`;
   - check-out mengunci baris tiket, mengisi `exitTime`/`fee`, mengubah tiket menjadi `COMPLETED`, lalu mengembalikan slot menjadi `AVAILABLE`.
   Semua perubahan di-rollback bila salah satu langkah gagal.
4. Tarif dibulatkan ke atas per jam, minimal 1 jam.
   - CAR: Rp 3.000 jam pertama + Rp 2.000 per jam berikutnya.
   - MOTORCYCLE: Rp 2.000 jam pertama + Rp 1.000 per jam berikutnya.
5. Kendaraan dengan tiket `ACTIVE` tidak dapat dihapus (409).
6. Slot `OCCUPIED` tidak dapat diubah menjadi `MAINTENANCE` (409).

## Contoh cURL

Contoh di bawah memakai bash. Di **PowerShell Windows**, gunakan `curl.exe` agar tidak memakai alias `Invoke-WebRequest`.

### Vehicles

```bash
# List + pagination + sorting + filter
curl "http://localhost:3000/api/v1/vehicles?page=1&limit=10&type=CAR&q=budi&sort=-createdAt"

# Create (201 + Location)
curl -i -X POST http://localhost:3000/api/v1/vehicles \
  -H "Content-Type: application/json" \
  -d '{"plateNumber":"B 1001 XY","type":"CAR","ownerName":"Budi Santoso"}'

# Get by id (perhatikan header ETag)
curl -i http://localhost:3000/api/v1/vehicles/1

# Replace (PUT, semua field wajib, If-Match wajib)
curl -i -X PUT http://localhost:3000/api/v1/vehicles/1 \
  -H "Content-Type: application/json" \
  -H 'If-Match: "v1"' \
  -d '{"plateNumber":"B 1001 XY","type":"CAR","ownerName":"Budi Santoso"}'

# Partial update (PATCH, If-Match wajib)
curl -i -X PATCH http://localhost:3000/api/v1/vehicles/1 \
  -H "Content-Type: application/json" \
  -H 'If-Match: "v1"' \
  -d '{"ownerName":"Budi Santoso Baru"}'

# Delete (204, If-Match wajib)
curl -i -X DELETE http://localhost:3000/api/v1/vehicles/1 \
  -H 'If-Match: "v2"'
```

### Slots

```bash
# List + filter
curl "http://localhost:3000/api/v1/slots?status=AVAILABLE&type=CAR&floor=1&sort=code&page=1&limit=10"

# Create
curl -i -X POST http://localhost:3000/api/v1/slots \
  -H "Content-Type: application/json" \
  -d '{"code":"A-01","floor":1,"type":"CAR"}'

# Get by id
curl http://localhost:3000/api/v1/slots/1

# Partial update (status/data)
curl -X PATCH http://localhost:3000/api/v1/slots/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"MAINTENANCE"}'
```

### Tickets

```bash
# Check-in
curl -i -X POST http://localhost:3000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -d '{"vehicleId":1,"slotId":1}'

# List (halaman pertama)
curl "http://localhost:3000/api/v1/tickets?status=ACTIVE&limit=10"

# List (halaman berikutnya memakai cursor)
curl "http://localhost:3000/api/v1/tickets?limit=10&cursor=eyJ0IjoiMjAyNi0xMS0wM1QwODowMDowMC4wMDBaIiwiaWQiOjF9"

# Get by id
curl http://localhost:3000/api/v1/tickets/1

# Check-out
curl -X PATCH http://localhost:3000/api/v1/tickets/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
```

## Pengujian

```bash
npm test              # 21 test (unit, integration, e2e)
npm run test:e2e      # e2e dengan Supertest
npm run test:cov      # test + coverage
```

E2E test memakai **database PostgreSQL terpisah**:

- `test/test-env.ts` mengarahkan `DB_NAME` ke `DB_NAME_TEST` (default `parkirku_test`) sebelum aplikasi diimpor;
- `test/global-setup.ts` membuat database test bila belum ada dan menjalankan seluruh migration;
- setiap test mengosongkan tabel (`TRUNCATE ... RESTART IDENTITY CASCADE`) agar saling independen.

Database test memakai server PostgreSQL yang sama dengan `.env`; pastikan server sudah berjalan sebelum `npm test`.

Hasil Tahap 3: unit 2 suite (5 test), integration 1 suite (1 test), E2E 1 suite (15 test); total `npm test` 4 suite (21 test).

Cakupan pengujian:

- Unit: pembulatan jam dan tarif CAR/MOTORCYCLE.
- E2E: create 201 + `Location`, plat/kode duplikat 409 (termasuk constraint database), validasi 400 + `errors`, GET 404,
  pagination/sorting/filtering, PUT/PATCH/DELETE, CRUD slot, check-in/check-out + fee,
  cursor tiket, dan validasi check-out.
- ETag/If-Match: `"v1"` → 304 dengan `If-None-Match` yang cocok, 428 tanpa `If-Match`, 412 bila versi basi,
  serta kenaikan versi `"v1"` → `"v2"` (PUT) → `"v3"` (PATCH).
- Kegagalan nyata di database (dengan pembuktian rollback):
  - check-in ke slot `OCCUPIED` → 409, jumlah tiket dan status slot tidak berubah;
  - check-in ke slot dengan tipe berbeda → 409, tidak ada tiket baru;
  - check-in ke slot `MAINTENANCE` → 409, tidak ada tiket baru;
  - slot `OCCUPIED` gagal diubah ke `MAINTENANCE` → 409, status slot tetap;
  - kendaraan dengan tiket `ACTIVE` gagal dihapus → 409.

## Swagger / OpenAPI

Setelah server berjalan, buka **`http://localhost:3000/docs`** untuk Swagger UI (semua endpoint terdokumentasi). Ekspor spesifikasi ke file:

```bash
npm run openapi:export   # menghasilkan openapi.yaml di root repo
```

## Menjalankan berbagai jenis pengujian

```bash
npm run test:unit         # unit test (service + fee, repository di-mock)
npm run test:integration # integration test (service + database sungguhan)
npm run test:e2e         # E2E via Supertest
npm run test:cov         # test + coverage
npm run test:newman      # Postman collection via Newman (server harus berjalan)
```

Jalankan Newman terhadap server lokal yang sudah di-seed:

```bash
npm run start:dev
# terminal lain:
npm run test:newman
```

## Catatan Implementasi

- Skema dikelola sepenuhnya lewat migration; `synchronize` selalu `false`.
- `version` pada `vehicles` tidak ditampilkan di body response, hanya dipakai untuk ETag.
- Swagger UI tersedia di `/docs`; spesifikasi OpenAPI di `openapi.yaml`.
