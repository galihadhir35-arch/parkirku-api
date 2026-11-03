import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/setup-app';

describe('ParkirKu API (e2e, PostgreSQL)', () => {
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
    await truncateAll();
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  const truncateAll = async (): Promise<void> => {
    await dataSource.query(
      'TRUNCATE TABLE "tickets", "slots", "vehicles" RESTART IDENTITY CASCADE',
    );
  };

  const countTickets = async (): Promise<number> => {
    const rows = await dataSource.query(
      'SELECT COUNT(*)::int AS count FROM "tickets"',
    );

    return rows[0].count as number;
  };

  const http = () => request(app.getHttpServer());

  const createVehicle = (overrides: Record<string, unknown> = {}) =>
    http()
      .post('/api/v1/vehicles')
      .send({
        plateNumber: 'B 1001 XY',
        type: 'CAR',
        ownerName: 'Budi Santoso',
        ...overrides,
      });

  const createSlot = (overrides: Record<string, unknown> = {}) =>
    http()
      .post('/api/v1/slots')
      .send({
        code: 'A-01',
        floor: 1,
        type: 'CAR',
        ...overrides,
      });

  it('POST /vehicles membuat kendaraan, mengirim Location, dan menyembunyikan version', async () => {
    const response = await createVehicle({
      plateNumber: ' h 1234 ab ',
      ownerName: '  Siti  ',
    }).expect(201);

    expect(response.headers.location).toBe(
      `/api/v1/vehicles/${response.body.id}`,
    );
    expect(response.body).toMatchObject({
      id: 1,
      plateNumber: 'H 1234 AB',
      type: 'CAR',
      ownerName: 'Siti',
    });
    expect(response.body.createdAt).toEqual(expect.any(String));
    expect(new Date(response.body.createdAt).toISOString()).toBe(
      response.body.createdAt,
    );
    expect(response.body).not.toHaveProperty('version');
  });

  it('POST /vehicles dengan plat duplikat menghasilkan 409 Problem Details', async () => {
    await createVehicle().expect(201);

    const response = await createVehicle({ ownerName: 'Orang Lain' }).expect(409);

    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.body).toMatchObject({
      type: 'https://api.parkirku.example/problems/duplicate-plate',
      title: 'Plat nomor sudah terdaftar',
      status: 409,
      detail: 'Kendaraan dengan plat nomor B 1001 XY sudah terdaftar.',
      instance: '/api/v1/vehicles',
    });
  });

  it('POST /vehicles dengan body tidak valid menghasilkan 400 + errors', async () => {
    const response = await createVehicle({
      plateNumber: '',
      type: 'PLANE',
      ownerName: 'A',
      unknownField: true,
    }).expect(400);

    expect(response.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(response.body).toMatchObject({
      type: 'https://api.parkirku.example/problems/validation-error',
      status: 400,
      instance: '/api/v1/vehicles',
    });

    const fields = (response.body.errors as { field: string }[]).map(
      (error) => error.field,
    );
    expect(fields).toEqual(
      expect.arrayContaining(['plateNumber', 'type', 'ownerName', 'unknownField']),
    );
  });

  it('GET/PATCH/DELETE /vehicles/{id} yang tidak ada menghasilkan 404', async () => {
    const fetched = await http().get('/api/v1/vehicles/999').expect(404);
    expect(fetched.body).toMatchObject({
      type: 'https://api.parkirku.example/problems/not-found',
      title: 'Data tidak ditemukan',
      status: 404,
      detail: 'Kendaraan dengan id 999 tidak ditemukan.',
      instance: '/api/v1/vehicles/999',
    });

    await http()
      .patch('/api/v1/vehicles/999')
      .set('If-Match', '"v1"')
      .send({ ownerName: 'Tidak Ada' })
      .expect(404);

    await http()
      .delete('/api/v1/vehicles/999')
      .set('If-Match', '"v1"')
      .expect(404);
  });

  it('GET /vehicles mendukung pagination, sorting, filter q, dan menolak query asing', async () => {
    await createVehicle({
      plateNumber: 'B 1001 XY',
      type: 'CAR',
      ownerName: 'Budi',
    }).expect(201);
    await createVehicle({
      plateNumber: 'B 2002 XY',
      type: 'CAR',
      ownerName: 'Siti',
    }).expect(201);
    await createVehicle({
      plateNumber: 'D 3003 ZZ',
      type: 'MOTORCYCLE',
      ownerName: 'Agus',
    }).expect(201);

    const page = await http()
      .get('/api/v1/vehicles')
      .query({ page: 2, limit: 2, sort: 'plateNumber' })
      .expect(200);

    expect(page.body.meta).toEqual({
      page: 2,
      limit: 2,
      totalItems: 3,
      totalPages: 2,
    });
    expect(page.body.data).toHaveLength(1);

    const filtered = await http()
      .get('/api/v1/vehicles')
      .query({ q: 'siti', type: 'CAR' })
      .expect(200);

    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].ownerName).toBe('Siti');

    const unknownQuery = await http()
      .get('/api/v1/vehicles')
      .query({ foo: 'bar' })
      .expect(400);
    expect(unknownQuery.body.type).toBe(
      'https://api.parkirku.example/problems/invalid-query',
    );

    const badSort = await http()
      .get('/api/v1/vehicles')
      .query({ sort: 'ownerName' })
      .expect(400);
    expect(badSort.body.detail).toContain('ownerName');
  });

  it('ETag/If-Match: GET 304, PUT/PATCH/DELETE wajib If-Match dan versi naik', async () => {
    const created = await createVehicle().expect(201);
    const id = created.body.id;

    const firstGet = await http().get(`/api/v1/vehicles/${id}`).expect(200);
    const firstEtag = firstGet.headers.etag as string;

    expect(firstEtag).toBe('"v1"');

    await http()
      .get(`/api/v1/vehicles/${id}`)
      .set('If-None-Match', firstEtag)
      .expect(304);

    await http()
      .get(`/api/v1/vehicles/${id}`)
      .set('If-None-Match', '"v99"')
      .expect(200);

    const missingHeader = await http()
      .put(`/api/v1/vehicles/${id}`)
      .send({
        plateNumber: 'B 1001 XY',
        type: 'CAR',
        ownerName: 'Tanpa If-Match',
      })
      .expect(428);
    expect(missingHeader.body.type).toBe(
      'https://api.parkirku.example/problems/precondition-required',
    );

    const staleHeader = await http()
      .patch(`/api/v1/vehicles/${id}`)
      .set('If-Match', '"v99"')
      .send({ ownerName: 'Versi Lama' })
      .expect(412);
    expect(staleHeader.body.type).toBe(
      'https://api.parkirku.example/problems/precondition-failed',
    );

    const replaced = await http()
      .put(`/api/v1/vehicles/${id}`)
      .set('If-Match', firstEtag)
      .send({
        plateNumber: 'B 9999 QA',
        type: 'MOTORCYCLE',
        ownerName: 'Budi Baru',
      })
      .expect(200);

    expect(replaced.body).toMatchObject({
      id,
      plateNumber: 'B 9999 QA',
      type: 'MOTORCYCLE',
      ownerName: 'Budi Baru',
    });
    expect(replaced.headers.etag).toBe('"v2"');

    const patched = await http()
      .patch(`/api/v1/vehicles/${id}`)
      .set('If-Match', replaced.headers.etag)
      .send({ ownerName: 'Nama Patch' })
      .expect(200);

    expect(patched.body).toMatchObject({
      plateNumber: 'B 9999 QA',
      ownerName: 'Nama Patch',
    });
    expect(patched.headers.etag).toBe('"v3"');

    await http()
      .delete(`/api/v1/vehicles/${id}`)
      .set('If-Match', patched.headers.etag)
      .expect(204);

    await http().get(`/api/v1/vehicles/${id}`).expect(404);
  });

  it('slot: POST, filter daftar, PATCH status, dan kode duplikat 409', async () => {
    const created = await createSlot().expect(201);
    expect(created.headers.location).toBe('/api/v1/slots/1');
    expect(created.body).toEqual({
      id: 1,
      code: 'A-01',
      floor: 1,
      type: 'CAR',
      status: 'AVAILABLE',
    });

    await createSlot({ code: 'A-01' }).expect(409);
    await createSlot({ code: 'B-01', floor: 2, type: 'MOTORCYCLE' }).expect(201);

    const filtered = await http()
      .get('/api/v1/slots')
      .query({ floor: 2, sort: '-code' })
      .expect(200);
    expect(filtered.body.meta.totalItems).toBe(1);
    expect(filtered.body.data[0].code).toBe('B-01');

    const patched = await http()
      .patch('/api/v1/slots/1')
      .send({ status: 'MAINTENANCE' })
      .expect(200);
    expect(patched.body.status).toBe('MAINTENANCE');

    await http().get('/api/v1/slots/999').expect(404);
  });

  it('check-in lalu check-out menghitung fee dan mengembalikan slot ke AVAILABLE', async () => {
    const vehicle = await createVehicle().expect(201);
    const slot = await createSlot().expect(201);

    const checkIn = await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
      .expect(201);

    expect(checkIn.headers.location).toBe('/api/v1/tickets/1');
    expect(checkIn.body).toMatchObject({
      id: 1,
      vehicleId: 1,
      slotId: 1,
      exitTime: null,
      fee: null,
      status: 'ACTIVE',
    });

    const occupied = await http().get('/api/v1/slots/1').expect(200);
    expect(occupied.body.status).toBe('OCCUPIED');

    const secondCheckIn = await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
      .expect(409);
    expect(secondCheckIn.body.type).toBe(
      'https://api.parkirku.example/problems/vehicle-in-use',
    );

    const checkOut = await http()
      .patch('/api/v1/tickets/1')
      .send({ status: 'COMPLETED' })
      .expect(200);

    expect(checkOut.body.status).toBe('COMPLETED');
    expect(checkOut.body.fee).toBe(3000);
    expect(checkOut.body.exitTime).toEqual(expect.any(String));

    const available = await http().get('/api/v1/slots/1').expect(200);
    expect(available.body.status).toBe('AVAILABLE');

    await http()
      .patch('/api/v1/tickets/1')
      .send({ status: 'COMPLETED' })
      .expect(409);
  });

  it('check-in ke slot OCCUPIED menghasilkan 409 tanpa menambah tiket atau mengubah slot', async () => {
    const firstVehicle = await createVehicle().expect(201);
    const secondVehicle = await createVehicle({
      plateNumber: 'B 2002 AB',
    }).expect(201);
    const slot = await createSlot().expect(201);

    await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: firstVehicle.body.id, slotId: slot.body.id })
      .expect(201);

    const response = await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: secondVehicle.body.id, slotId: slot.body.id })
      .expect(409);

    expect(response.body.type).toBe(
      'https://api.parkirku.example/problems/slot-occupied',
    );

    expect(await countTickets()).toBe(1);

    const rows = await dataSource.query(
      'SELECT "slot_id", "vehicle_id", "status" FROM "tickets"',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      slot_id: slot.body.id,
      vehicle_id: firstVehicle.body.id,
      status: 'ACTIVE',
    });

    const unchanged = await http()
      .get(`/api/v1/slots/${slot.body.id}`)
      .expect(200);
    expect(unchanged.body.status).toBe('OCCUPIED');
  });

  it('check-in ke slot dengan tipe tidak cocok menghasilkan 409 tanpa mengubah data', async () => {
    const vehicle = await createVehicle({ type: 'CAR' }).expect(201);
    const slot = await createSlot({ code: 'M-01', type: 'MOTORCYCLE' }).expect(
      201,
    );

    const response = await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
      .expect(409);

    expect(response.body.type).toBe(
      'https://api.parkirku.example/problems/slot-occupied',
    );
    expect(await countTickets()).toBe(0);

    const unchanged = await http().get(`/api/v1/slots/${slot.body.id}`).expect(200);
    expect(unchanged.body.status).toBe('AVAILABLE');
  });

  it('check-in ke slot MAINTENANCE menghasilkan 409 dan tidak membuat tiket', async () => {
    const vehicle = await createVehicle().expect(201);
    const slot = await createSlot().expect(201);

    await http()
      .patch(`/api/v1/slots/${slot.body.id}`)
      .send({ status: 'MAINTENANCE' })
      .expect(200);

    await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
      .expect(409);

    expect(await countTickets()).toBe(0);
  });

  it('slot OCCUPIED tidak boleh diubah ke MAINTENANCE (409)', async () => {
    const vehicle = await createVehicle().expect(201);
    const slot = await createSlot().expect(201);

    await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
      .expect(201);

    const response = await http()
      .patch(`/api/v1/slots/${slot.body.id}`)
      .send({ status: 'MAINTENANCE' })
      .expect(409);

    expect(response.body.type).toBe(
      'https://api.parkirku.example/problems/slot-occupied',
    );

    const stillOccupied = await http()
      .get(`/api/v1/slots/${slot.body.id}`)
      .expect(200);
    expect(stillOccupied.body.status).toBe('OCCUPIED');
  });

  it('kendaraan dengan tiket ACTIVE tidak boleh dihapus (409)', async () => {
    const vehicle = await createVehicle().expect(201);
    const slot = await createSlot().expect(201);
    const etag = (await http().get(`/api/v1/vehicles/${vehicle.body.id}`).expect(200))
      .headers.etag as string;

    await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
      .expect(201);

    const response = await http()
      .delete(`/api/v1/vehicles/${vehicle.body.id}`)
      .set('If-Match', etag)
      .expect(409);

    expect(response.body.type).toBe(
      'https://api.parkirku.example/problems/vehicle-in-use',
    );

    await http()
      .patch('/api/v1/tickets/1')
      .send({ status: 'COMPLETED' })
      .expect(200);
    await http()
      .delete(`/api/v1/vehicles/${vehicle.body.id}`)
      .set('If-Match', etag)
      .expect(204);
  });

  it('GET /tickets memakai cursor dan meta.nextCursor', async () => {
    for (let index = 1; index <= 3; index += 1) {
      const vehicle = await createVehicle({
        plateNumber: `B 100${index} XY`,
      }).expect(201);
      const slot = await createSlot({
        code: `A-0${index}`,
      }).expect(201);

      await http()
        .post('/api/v1/tickets')
        .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
        .expect(201);
    }

    const firstPage = await http()
      .get('/api/v1/tickets')
      .query({ limit: 2 })
      .expect(200);

    expect(firstPage.body.data).toHaveLength(2);
    expect(firstPage.body.meta.limit).toBe(2);
    expect(firstPage.body.meta.nextCursor).toEqual(expect.any(String));
    expect(firstPage.body.data.map((ticket: { id: number }) => ticket.id)).toEqual([
      3, 2,
    ]);

    const secondPage = await http()
      .get('/api/v1/tickets')
      .query({
        limit: 2,
        cursor: firstPage.body.meta.nextCursor,
      })
      .expect(200);

    expect(secondPage.body.data).toHaveLength(1);
    expect(secondPage.body.data[0].id).toBe(1);
    expect(secondPage.body.meta.nextCursor).toBeNull();

    const filtered = await http()
      .get('/api/v1/tickets')
      .query({ status: 'ACTIVE', vehicleId: 2 })
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0].vehicleId).toBe(2);

    await http()
      .get('/api/v1/tickets')
      .query({ cursor: 'bukan-cursor' })
      .expect(400);

    await http()
      .get('/api/v1/tickets')
      .query({ limit: 0 })
      .expect(400);
  });

  it('PATCH /tickets hanya menerima status COMPLETED', async () => {
    const vehicle = await createVehicle().expect(201);
    const slot = await createSlot().expect(201);

    await http()
      .post('/api/v1/tickets')
      .send({ vehicleId: vehicle.body.id, slotId: slot.body.id })
      .expect(201);

    const response = await http()
      .patch('/api/v1/tickets/1')
      .send({ status: 'ACTIVE' })
      .expect(400);

    expect(response.body.type).toBe(
      'https://api.parkirku.example/problems/validation-error',
    );
  });
});
