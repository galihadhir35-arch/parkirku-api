# ParkirKu API

REST API manajemen parkir menggunakan **NestJS (TypeScript)**. Project ini adalah hasil **Tahap 1** (Tugas 5): CRUD lengkap dengan penyimpanan **in-memory**, validasi DTO, error format **Problem Details (RFC 9457)**, pagination, sorting, filtering, dan cursor untuk tiket.

> Tahap 2 akan mengganti penyimpanan in-memory dengan PostgreSQL/TypeORM. ETag/If-Match juga dijadwalkan pada akhir Tahap 2.

## Teknologi

- NestJS 11 + TypeScript
- class-validator & class-transformer
- Jest + Supertest
- Penyimpanan in-memory (belum memakai database)

## Persiapan

Prasyarat: **Node.js 20+** dan **npm**.

```bash
npm install
cp .env.example .env       # Windows PowerShell: Copy-Item .env.example .env
```

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

Server berjalan di `http://localhost:3000` dengan base path **`/api/v1`**.
Port dapat diubah lewat variabel `PORT` di `.env`.

> Data disimpan di memori, sehingga **semua data hilang saat server di-restart**.

## Script npm

| Script | Fungsi |
|---|---|
| `npm run start:dev` | Menjalankan server dengan watch mode |
| `npm run build` | Compile TypeScript ke folder `dist/` |
| `npm test` | Menjalankan seluruh unit test dan e2e test |
| `npm run test:e2e` | Menjalankan e2e test (Supertest) |
| `npm run test:cov` | Menjalankan test + laporan coverage |

## Struktur folder

```text
ParkirKu/
├── src/
│   ├── main.ts                         # bootstrap + port
│   ├── setup-app.ts                    # global prefix, pipe, filter (dipakai test juga)
│   ├── app.module.ts
│   ├── common/
│   │   ├── enums.ts                    # VehicleType, SlotStatus, TicketStatus
│   │   ├── errors/problem-details.ts   # exception + factory Problem Details
│   │   ├── filters/problem-details.filter.ts
│   │   ├── pipes/api-validation.pipe.ts
│   │   ├── store/in-memory.store.ts    # data in-memory + simulasi transaksi
│   │   ├── store/in-memory-store.module.ts
│   │   └── utils/                      # cursor, pagination, sort
│   ├── vehicles/
│   │   ├── dto/
│   │   ├── vehicle.model.ts
│   │   ├── vehicles.controller.ts
│   │   ├── vehicles.module.ts
│   │   ├── vehicles.repository.ts
│   │   └── vehicles.service.ts
│   ├── slots/
│   │   ├── dto/
│   │   ├── slot.model.ts
│   │   ├── slots.controller.ts
│   │   ├── slots.module.ts
│   │   ├── slots.repository.ts
│   │   └── slots.service.ts
│   └── tickets/
│       ├── dto/
│       ├── ticket.model.ts
│       ├── ticket-fee.ts               # perhitungan tarif
│       ├── tickets.controller.ts
│       ├── tickets.module.ts
│       ├── tickets.repository.ts
│       └── tickets.service.ts
├── test/parkirku.e2e-spec.ts
├── .env.example
├── .gitignore
└── README.md
```

Setiap resource memisahkan tanggung jawab:

- **Controller** hanya menangani routing, parsing parameter, status code, dan header `Location`.
- **Service** berisi aturan bisnis dan pemetaan response.
- **Repository** satu-satunya lapisan yang mengakses data.
- **DTO** menangani validasi input dengan `class-validator`.

Dependency Injection terlihat dari constructor: controller menerima service, service menerima repository.
`TicketsService` memakai `VehiclesService` dan `SlotsService` yang diekspor oleh module masing-masing.

## Endpoint

Semua URL diawali `/api/v1`.

| Method | URL | Fungsi | Sukses | Error |
|---|---|---|---|---|
| GET | `/vehicles` | Daftar kendaraan (`page`, `limit`, `type`, `q`, `sort`) | 200 | 400 |
| POST | `/vehicles` | Daftar kendaraan baru | 201 + `Location` | 400, 409 |
| GET | `/vehicles/{id}` | Detail kendaraan | 200 | 404 |
| PUT | `/vehicles/{id}` | Ganti seluruh data kendaraan | 200 | 400, 404, 409 |
| PATCH | `/vehicles/{id}` | Ubah sebagian data kendaraan | 200 | 400, 404, 409 |
| DELETE | `/vehicles/{id}` | Hapus kendaraan | 204 | 404, 409 |
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

Nilai `type` yang dipakai: `validation-error`, `invalid-query`, `not-found`, `duplicate-plate`, `duplicate-slot-code`, `slot-occupied`, `vehicle-in-use`, `ticket-already-completed`, `internal-error`.

### Aturan bisnis yang sudah diterapkan

1. Check-in hanya untuk slot `AVAILABLE` dengan tipe yang sama dengan kendaraan (409 jika gagal).
2. Satu kendaraan hanya boleh memiliki satu tiket `ACTIVE` (409).
3. Check-in membuat tiket `ACTIVE` + slot `OCCUPIED`; check-out mengisi `exitTime`/`fee`, tiket `COMPLETED`, slot `AVAILABLE`. Keduanya dibungkus transaksi in-memory (rollback jika gagal).
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

# Get by id
curl http://localhost:3000/api/v1/vehicles/1

# Replace (PUT, semua field wajib)
curl -X PUT http://localhost:3000/api/v1/vehicles/1 \
  -H "Content-Type: application/json" \
  -d '{"plateNumber":"B 1001 XY","type":"CAR","ownerName":"Budi Santoso"}'

# Partial update (PATCH)
curl -X PATCH http://localhost:3000/api/v1/vehicles/1 \
  -H "Content-Type: application/json" \
  -d '{"ownerName":"Budi Santoso Baru"}'

# Delete (204)
curl -i -X DELETE http://localhost:3000/api/v1/vehicles/1
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
npm test              # 16 test (unit + e2e)
npm run test:e2e      # e2e dengan Supertest
npm run test:cov      # test + coverage
```

Hasil Tahap 1: **2 test suite, 16 test lulus**.

Cakupan pengujian:

- Unit: pembulatan jam dan tarif CAR/MOTORCYCLE.
- E2E: create 201 + `Location`, plat duplikat 409, validasi 400 + `errors`, GET 404,
  pagination/sorting/filtering, PUT/PATCH/DELETE, CRUD slot, check-in/check-out + fee,
  tipe slot tidak cocok 409 tanpa perubahan data, slot `MAINTENANCE` 409, hapus kendaraan
  dengan tiket aktif 409, cursor tiket, dan validasi check-out.

## Catatan Tahap 1

- Belum memakai database; repository masih array in-memory.
- Endpoint ETag/`If-Match` untuk vehicles belum dibuat (dijadwalkan akhir Tahap 2).
- Swagger UI dan `openapi.yaml` belum dibuat (Tahap 3).
