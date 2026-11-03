import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { VehicleType } from '../common/enums';
import {
  duplicatePlateProblem,
  notFoundProblem,
  preconditionFailedProblem,
  preconditionRequiredProblem,
  vehicleInUseProblem,
} from '../common/errors/problem-details';
import { etagMatches } from '../common/utils/etag';
import { OffsetPage, buildOffsetMeta } from '../common/utils/pagination';
import { parseSort } from '../common/utils/sort';
import { TicketsRepository } from '../tickets/tickets.repository';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { PatchVehicleDto } from './dto/patch-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './vehicle.entity';
import { VehiclesRepository } from './vehicles.repository';

export interface VehicleResponse {
  id: number;
  plateNumber: string;
  type: VehicleType;
  ownerName: string;
  createdAt: string;
}

export interface VehicleWithVersion {
  data: VehicleResponse;
  version: number;
}

const VEHICLE_SORT_FIELDS = ['plateNumber', 'createdAt'] as const;

@Injectable()
export class VehiclesService {
  constructor(
    private readonly vehiclesRepository: VehiclesRepository,
    private readonly ticketsRepository: TicketsRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryVehicleDto): Promise<OffsetPage<VehicleResponse>> {
    const sort = parseSort(query.sort, VEHICLE_SORT_FIELDS, '-createdAt');
    const { items, totalItems } = await this.vehiclesRepository.findMany({
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

  async findOne(id: number): Promise<VehicleResponse> {
    return (await this.findOneWithVersion(id)).data;
  }

  async findOneWithVersion(id: number): Promise<VehicleWithVersion> {
    const vehicle = await this.getOrThrow(id);

    return {
      data: this.toResponse(vehicle),
      version: vehicle.version,
    };
  }

  async create(dto: CreateVehicleDto): Promise<VehicleResponse> {
    await this.assertPlateAvailable(dto.plateNumber);

    const vehicle = await this.vehiclesRepository.create({
      plateNumber: dto.plateNumber,
      type: dto.type,
      ownerName: dto.ownerName,
    });

    return this.toResponse(vehicle);
  }

  async replace(
    id: number,
    dto: UpdateVehicleDto,
    ifMatch?: string,
  ): Promise<VehicleWithVersion> {
    return this.dataSource.transaction(async (manager) => {
      const vehicle = await this.getOrThrowForUpdate(id, manager);
      this.assertIfMatch(vehicle, ifMatch);
      await this.assertPlateAvailable(dto.plateNumber, id, manager);

      const updated = await this.vehiclesRepository.update(
        id,
        {
          plateNumber: dto.plateNumber,
          type: dto.type,
          ownerName: dto.ownerName,
        },
        manager,
      );

      return {
        data: this.toResponse(updated ?? vehicle),
        version: updated?.version ?? vehicle.version,
      };
    });
  }

  async patch(
    id: number,
    dto: PatchVehicleDto,
    ifMatch?: string,
  ): Promise<VehicleWithVersion> {
    return this.dataSource.transaction(async (manager) => {
      const vehicle = await this.getOrThrowForUpdate(id, manager);
      this.assertIfMatch(vehicle, ifMatch);

      if (dto.plateNumber !== undefined) {
        await this.assertPlateAvailable(dto.plateNumber, id, manager);
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

      const updated = await this.vehiclesRepository.update(
        id,
        changes,
        manager,
      );

      return {
        data: this.toResponse(updated ?? vehicle),
        version: updated?.version ?? vehicle.version,
      };
    });
  }

  async remove(id: number, ifMatch?: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const vehicle = await this.getOrThrowForUpdate(id, manager);
      this.assertIfMatch(vehicle, ifMatch);

      if (
        await this.ticketsRepository.hasActiveTicketForVehicle(id, manager)
      ) {
        throw vehicleInUseProblem(
          `Kendaraan dengan plat nomor ${vehicle.plateNumber} masih memiliki tiket ACTIVE.`,
        );
      }

      await this.vehiclesRepository.delete(id, manager);
    });
  }

  /** Dipakai TicketsService di dalam transaksi check-in/check-out. */
  async findEntityOrThrow(
    id: number,
    manager?: EntityManager,
  ): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findById(id, manager);

    if (!vehicle) {
      throw notFoundProblem(`Kendaraan dengan id ${id} tidak ditemukan.`);
    }

    return vehicle;
  }

  private async getOrThrow(id: number): Promise<Vehicle> {
    return this.findEntityOrThrow(id);
  }

  private async getOrThrowForUpdate(
    id: number,
    manager: EntityManager,
  ): Promise<Vehicle> {
    const vehicle = await this.vehiclesRepository.findByIdForUpdate(
      id,
      manager,
    );

    if (!vehicle) {
      throw notFoundProblem(`Kendaraan dengan id ${id} tidak ditemukan.`);
    }

    return vehicle;
  }

  private assertIfMatch(vehicle: Vehicle, ifMatch?: string): void {
    if (!ifMatch) {
      throw preconditionRequiredProblem(
        'Header If-Match wajib dikirim untuk mengubah atau menghapus kendaraan.',
      );
    }

    if (!etagMatches(ifMatch, vehicle.version)) {
      throw preconditionFailedProblem(
        `Nilai If-Match tidak cocok. Versi kendaraan saat ini adalah v${vehicle.version}.`,
      );
    }
  }

  private async assertPlateAvailable(
    plateNumber: string,
    excludeId?: number,
    manager?: EntityManager,
  ): Promise<void> {
    const existing = await this.vehiclesRepository.findByPlateNumber(
      plateNumber,
      excludeId,
      manager,
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
