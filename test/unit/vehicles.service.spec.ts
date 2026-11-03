import { VehicleType } from '../../src/common/enums';
import { VehiclesService } from '../../src/vehicles/vehicles.service';
import { VehiclesRepository } from '../../src/vehicles/vehicles.repository';
import { TicketsRepository } from '../../src/tickets/tickets.repository';
import { DataSource } from 'typeorm';

describe('VehiclesService (unit)', () => {
  let service: VehiclesService;
  let vehiclesRepository: jest.Mocked<VehiclesRepository>;
  let ticketsRepository: jest.Mocked<TicketsRepository>;

  beforeEach(() => {
    vehiclesRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      findByIdForUpdate: jest.fn(),
      findByPlateNumber: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<VehiclesRepository>;

    ticketsRepository = {
      hasActiveTicketForVehicle: jest.fn(),
    } as unknown as jest.Mocked<TicketsRepository>;

    const dataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) => cb({})),
    } as unknown as DataSource;

    service = new VehiclesService(
      vehiclesRepository,
      ticketsRepository,
      dataSource,
    );
  });

  it('membuat kendaraan baru saat plat belum dipakai', async () => {
    vehiclesRepository.findByPlateNumber.mockResolvedValue(null);
    vehiclesRepository.create.mockResolvedValue({
      id: 1,
      plateNumber: 'B 1001 XY',
      type: VehicleType.CAR,
      ownerName: 'Budi',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      version: 1,
      tickets: [],
    } as never);

    const result = await service.create({
      plateNumber: 'B 1001 XY',
      type: VehicleType.CAR,
      ownerName: 'Budi',
    });

    expect(result.plateNumber).toBe('B 1001 XY');
    expect(vehiclesRepository.create).toHaveBeenCalled();
  });

  it('menolak kendaraan dengan plat duplikat', async () => {
    vehiclesRepository.findByPlateNumber.mockResolvedValue({
      id: 9,
      plateNumber: 'B 1001 XY',
    } as never);

    await expect(
      service.create({
        plateNumber: 'B 1001 XY',
        type: VehicleType.CAR,
        ownerName: 'Budi',
      }),
    ).rejects.toThrow();
  });
});
