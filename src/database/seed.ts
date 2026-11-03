import 'reflect-metadata';
import 'dotenv/config';
import { SlotStatus, VehicleType } from '../common/enums';
import { Slot } from '../slots/slot.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import AppDataSource from './data-source';

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const vehicleRepository = AppDataSource.getRepository(Vehicle);
  const slotRepository = AppDataSource.getRepository(Slot);

  const vehicles = [
    {
      plateNumber: 'B 1001 XY',
      type: VehicleType.CAR,
      ownerName: 'Budi Santoso',
    },
    {
      plateNumber: 'B 2002 AB',
      type: VehicleType.CAR,
      ownerName: 'Siti Aminah',
    },
    {
      plateNumber: 'D 3003 ZZ',
      type: VehicleType.MOTORCYCLE,
      ownerName: 'Agus Setiawan',
    },
  ];

  for (const data of vehicles) {
    const exists = await vehicleRepository.findOneBy({
      plateNumber: data.plateNumber,
    });

    if (!exists) {
      await vehicleRepository.save(vehicleRepository.create(data));
    }
  }

  const slots = [
    { code: 'A-01', floor: 1, type: VehicleType.CAR },
    { code: 'A-02', floor: 1, type: VehicleType.CAR },
    { code: 'B-01', floor: 2, type: VehicleType.MOTORCYCLE },
    { code: 'B-02', floor: 2, type: VehicleType.MOTORCYCLE },
  ];

  for (const data of slots) {
    const exists = await slotRepository.findOneBy({ code: data.code });

    if (!exists) {
      await slotRepository.save(
        slotRepository.create({
          ...data,
          status: SlotStatus.AVAILABLE,
        }),
      );
    }
  }

  console.log(
    `Seed selesai: ${vehicles.length} kendaraan dan ${slots.length} slot tersedia/diperiksa.`,
  );

  await AppDataSource.destroy();
}

seed().catch(async (error: unknown) => {
  console.error('Seed gagal:', error);

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exitCode = 1;
});
