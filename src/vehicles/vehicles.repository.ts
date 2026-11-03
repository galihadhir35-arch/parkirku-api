import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { VehicleType } from '../common/enums';
import { SortRule } from '../common/utils/sort';
import { Vehicle } from './vehicle.entity';

export interface VehicleListFilter {
  type?: VehicleType;
  q?: string;
  sort: SortRule[];
  skip: number;
  take: number;
}

const SORT_COLUMNS: Record<string, string> = {
  plateNumber: 'vehicle.plate_number',
  createdAt: 'vehicle.created_at',
  id: 'vehicle.id',
};

@Injectable()
export class VehiclesRepository {
  constructor(
    @InjectRepository(Vehicle)
    private readonly repository: Repository<Vehicle>,
  ) {}

  private repo(manager?: EntityManager): Repository<Vehicle> {
    return manager ? manager.getRepository(Vehicle) : this.repository;
  }

  async create(
    data: { plateNumber: string; type: VehicleType; ownerName: string },
    manager?: EntityManager,
  ): Promise<Vehicle> {
    return this.repo(manager).save(this.repo(manager).create(data));
  }

  async findMany(
    filter: VehicleListFilter,
  ): Promise<{ items: Vehicle[]; totalItems: number }> {
    const query = this.repository.createQueryBuilder('vehicle');

    if (filter.type) {
      query.andWhere('vehicle.type = :type', { type: filter.type });
    }

    if (filter.q) {
      query.andWhere(
        '(LOWER(vehicle.plate_number) LIKE :q OR LOWER(vehicle.owner_name) LIKE :q)',
        { q: `%${filter.q.toLowerCase()}%` },
      );
    }

    for (const rule of filter.sort) {
      query.addOrderBy(
        SORT_COLUMNS[rule.field] ?? 'vehicle.id',
        rule.direction === 'asc' ? 'ASC' : 'DESC',
      );
    }

    query.skip(filter.skip).take(filter.take);

    const [items, totalItems] = await query.getManyAndCount();

    return { items, totalItems };
  }

  async findById(
    id: number,
    manager?: EntityManager,
  ): Promise<Vehicle | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  async findByIdForUpdate(
    id: number,
    manager: EntityManager,
  ): Promise<Vehicle | null> {
    return manager
      .getRepository(Vehicle)
      .createQueryBuilder('vehicle')
      .setLock('pessimistic_write')
      .where('vehicle.id = :id', { id })
      .getOne();
  }

  async findByPlateNumber(
    plateNumber: string,
    excludeId?: number,
    manager?: EntityManager,
  ): Promise<Vehicle | null> {
    const query = this.repo(manager)
      .createQueryBuilder('vehicle')
      .where('UPPER(vehicle.plate_number) = UPPER(:plateNumber)', {
        plateNumber,
      });

    if (excludeId !== undefined) {
      query.andWhere('vehicle.id <> :excludeId', { excludeId });
    }

    return query.getOne();
  }

  async update(
    id: number,
    changes: Partial<Pick<Vehicle, 'plateNumber' | 'type' | 'ownerName'>>,
    manager?: EntityManager,
  ): Promise<Vehicle | undefined> {
    const repo = this.repo(manager);
    const vehicle = await repo.findOne({ where: { id } });

    if (!vehicle) {
      return undefined;
    }

    Object.assign(vehicle, changes);

    return repo.save(vehicle);
  }

  async delete(id: number, manager?: EntityManager): Promise<boolean> {
    const result = await this.repo(manager).delete(id);

    return (result.affected ?? 0) > 0;
  }
}
