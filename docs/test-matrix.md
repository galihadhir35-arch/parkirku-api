# Matriks Pengujian ParkirKu

| ID | Endpoint | Skenario | Input | Hasil diharapkan | Jenis Test | Status |
|---|---|---|---|---|---|---|
| V-01 | POST /vehicles | Create sukses | body valid | 201 + Location | E2E | Lulus |
| V-02 | POST /vehicles | Plat duplikat | plat sama | 409 duplicate-plate | E2E | Lulus |
| V-03 | POST /vehicles | Body tidak valid | field salah | 400 validation-error | E2E | Lulus |
| V-04 | GET /vehicles/{id} | Tidak ditemukan | id=999 | 404 not-found | E2E | Lulus |
| V-05 | PUT /vehicles/{id} | Tanpa If-Match | - | 428 precondition-required | E2E | Lulus |
| V-06 | PATCH /vehicles/{id} | If-Match basi | If-Match lama | 412 precondition-failed | E2E | Lulus |
| S-01 | POST /slots | Create sukses | body valid | 201 + Location | E2E | Lulus |
| S-02 | POST /slots | Kode duplikat | kode sama | 409 duplicate-slot-code | E2E | Lulus |
| S-03 | GET /slots/{id} | Tidak ditemukan | id=999 | 404 not-found | E2E | Lulus |
| S-04 | PATCH /slots/{id} | OCCUPIED ke MAINTENANCE | status MAINTENANCE | 409 slot-occupied | E2E | Lulus |
| T-01 | POST /tickets | Check-in sukses | vehicleId, slotId valid | 201 + Location | E2E | Lulus |
| T-02 | POST /tickets | Slot OCCUPIED | slot sudah dipakai | 409 slot-occupied + rollback | E2E | Lulus |
| T-03 | POST /tickets | Tipe tidak cocok | CAR ke slot MOTORCYCLE | 409 slot-occupied | E2E | Lulus |
| T-04 | POST /tickets | Kendaraan sudah ACTIVE | check-in kedua | 409 vehicle-in-use | E2E | Lulus |
| T-05 | PATCH /tickets/{id} | Check-out sukses | status COMPLETED | 200 + fee | E2E | Lulus |
| T-06 | PATCH /tickets/{id} | Check-out ulang | tiket COMPLETED | 409 ticket-already-completed | E2E | Lulus |
| U-01 | - | Tarif CAR 3 jam 10 menit | durasi 4 jam | 9000 | Unit | Lulus |
| U-02 | - | Tarif MOTORCYCLE 1 jam | durasi 1 jam | 2000 | Unit | Lulus |
| I-01 | - | Unique constraint DB | insert plat duplikat | error 23505 | Integration | Lulus |
