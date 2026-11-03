import { Injectable } from '@nestjs/common';
import { VehicleType } from '../common/enums';
import { InMemoryStore } from '../common/store/in-memory.store';
import { SortRule, compareByRules } from '../common/utils/sort';
import { Vehicle } from './vehicle.model';

export interface VehicleListFilter {
  type?: VehicleType;
  q?: string;
  sort: SortRule[];
  skip: number;
  take: number;
}

@Injectable()
export class VehiclesRepository {
  constructor(private readonly store: InMemoryStore) {}

  create(data: {
    plateNumber: string;
    type: VehicleType;
    ownerName: string;
  }): Vehicle {
    const vehicle: Vehicle = {
      id: this.store.nextVehicleId(),
      plateNumber: data.plateNumber,
      type: data.type,
      ownerName: data.ownerName,
      createdAt: new Date(),
      version: 1,
    };

    this.store.vehicles.push(vehicle);

    return vehicle;
  }

  findMany(filter: VehicleListFilter): {
    items: Vehicle[];
    totalItems: number;
  } {
    const keyword = filter.q?.toLowerCase();

    const items = this.store.vehicles.filter((vehicle) => {
      if (filter.type && vehicle.type !== filter.type) {
        return false;
      }

      if (keyword) {
        const matchesPlate = vehicle.plateNumber.toLowerCase().includes(keyword);
        const matchesOwner = vehicle.ownerName.toLowerCase().includes(keyword);

        if (!matchesPlate && !matchesOwner) {
          return false;
        }
      }

      return true;
    });

    items.sort((left, right) => compareByRules(left, right, filter.sort));

    return {
      items: items.slice(filter.skip, filter.skip + filter.take),
      totalItems: items.length,
    };
  }

  findById(id: number): Vehicle | undefined {
    return this.store.vehicles.find((vehicle) => vehicle.id === id);
  }

  findByPlateNumber(
    plateNumber: string,
    excludeId?: number,
  ): Vehicle | undefined {
    const normalized = plateNumber.toUpperCase();

    return this.store.vehicles.find(
      (vehicle) =>
        vehicle.plateNumber.toUpperCase() === normalized &&
        vehicle.id !== excludeId,
    );
  }

  update(
    id: number,
    changes: Partial<Pick<Vehicle, 'plateNumber' | 'type' | 'ownerName'>>,
  ): Vehicle | undefined {
    const vehicle = this.findById(id);

    if (!vehicle) {
      return undefined;
    }

    Object.assign(vehicle, changes);
    vehicle.version += 1;

    return vehicle;
  }

  delete(id: number): boolean {
    const index = this.store.vehicles.findIndex(
      (vehicle) => vehicle.id === id,
    );

    if (index === -1) {
      return false;
    }

    this.store.vehicles.splice(index, 1);

    return true;
  }
}
