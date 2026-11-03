import { Injectable } from '@nestjs/common';
import { OffsetPage, buildOffsetMeta } from '../common/utils/pagination';
import { parseSort } from '../common/utils/sort';
import {
  duplicatePlateProblem,
  notFoundProblem,
  vehicleInUseProblem,
} from '../common/errors/problem-details';
import { VehicleType } from '../common/enums';
import { TicketsRepository } from '../tickets/tickets.repository';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { PatchVehicleDto } from './dto/patch-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './vehicle.model';
import { VehiclesRepository } from './vehicles.repository';

export interface VehicleResponse {
  id: number;
  plateNumber: string;
  type: VehicleType;
  ownerName: string;
  createdAt: string;
}

const VEHICLE_SORT_FIELDS = ['plateNumber', 'createdAt'] as const;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly ticketsRepository: TicketsRepository,
  ) {}

  findAll(query: QueryVehicleDto): OffsetPage<VehicleResponse> {
    const sort = parseSort(query.sort, VEHICLE_SORT_FIELDS, '-createdAt');
    const { items, totalItems } = this.vehiclesRepository.findMany({
      type: query.type,
      q: query.q,
      sort,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: items.map((vehicle) => this.toResponse(vehicle)),
      meta: buildOffsetMeta(query.page, query.limit, totalItems),
    };
  }

  findOne(id: number): VehicleResponse {
    return this.toResponse(this.getOrThrow(id));
  }

  create(dto: CreateVehicleDto): VehicleResponse {
    this.assertPlateAvailable(dto.plateNumber);

    const vehicle = this.vehiclesRepository.create({
      plateNumber: dto.plateNumber,
      type: dto.type,
      ownerName: dto.ownerName,
    });

    return this.toResponse(vehicle);
  }

  replace(id: number, dto: UpdateVehicleDto): VehicleResponse {
    const vehicle = this.getOrThrow(id);
    this.assertPlateAvailable(dto.plateNumber, id);

    const updated = this.vehiclesRepository.update(id, {
      plateNumber: dto.plateNumber,
      type: dto.type,
      ownerName: dto.ownerName,
    });

    return this.toResponse(updated ?? vehicle);
  }

  patch(id: number, dto: PatchVehicleDto): VehicleResponse {
    const vehicle = this.getOrThrow(id);

    if (dto.plateNumber !== undefined) {
      this.assertPlateAvailable(dto.plateNumber, id);
    }

    const changes: Partial<
      Pick<Vehicle, 'plateNumber' | 'type' | 'ownerName'>
    > = {};

    if (dto.plateNumber !== undefined) {
      changes.plateNumber = dto.plateNumber;
    }
    if (dto.type !== undefined) {
      changes.type = dto.type;
    }
    if (dto.ownerName !== undefined) {
      changes.ownerName = dto.ownerName;
    }

    const updated = this.vehiclesRepository.update(id, changes);

    return this.toResponse(updated ?? vehicle);
  }

  /** Dipakai TicketsService untuk validasi tipe kendaraan. */
  findEntityOrThrow(id: number): Vehicle {
    return this.getOrThrow(id);
  }

  remove(id: number): void {
    const vehicle = this.getOrThrow(id);

    if (this.ticketsRepository.hasActiveTicketForVehicle(id)) {
      throw vehicleInUseProblem(
        `Kendaraan dengan plat nomor ${vehicle.plateNumber} masih memiliki tiket ACTIVE.`,
      );
    }

    this.vehiclesRepository.delete(id);
  }

  private getOrThrow(id: number): Vehicle {
    const vehicle = this.vehiclesRepository.findById(id);

    if (!vehicle) {
      throw notFoundProblem(`Kendaraan dengan id ${id} tidak ditemukan.`);
    }

    return vehicle;
  }

  private assertPlateAvailable(plateNumber: string, excludeId?: number): void {
    const existing = this.vehiclesRepository.findByPlateNumber(
      plateNumber,
      excludeId,
    );

    if (existing) {
      throw duplicatePlateProblem(plateNumber);
    }
  }

  /** `version` dipakai untuk ETag, jadi tidak ditampilkan di body. */
  private toResponse(vehicle: Vehicle): VehicleResponse {
    return {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      ownerName: vehicle.ownerName,
      createdAt: vehicle.createdAt.toISOString(),
    };
  }
}
