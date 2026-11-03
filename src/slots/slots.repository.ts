import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SlotStatus, VehicleType } from '../common/enums';
import { SortRule } from '../common/utils/sort';
import { Slot } from './slot.entity';

export interface SlotListFilter {
  status?: SlotStatus;
  type?: VehicleType;
  floor?: number;
  sort: SortRule[];
  skip: number;
  take: number;
}

const SORT_COLUMNS: Record<string, string> = {
  code: 'slot.code',
  floor: 'slot.floor',
  id: 'slot.id',
};

@Injectable()
export class SlotsRepository {
  constructor(
    @InjectRepository(Slot)
    private readonly repository: Repository<Slot>,
  ) {}

  private repo(manager?: EntityManager): Repository<Slot> {
    return manager ? manager.getRepository(Slot) : this.repository;
  }

  async create(
    data: { code: string; floor: number; type: VehicleType },
    manager?: EntityManager,
  ): Promise<Slot> {
    return this.repo(manager).save(
      this.repo(manager).create({
        ...data,
        status: SlotStatus.AVAILABLE,
      }),
    );
  }

  async findMany(
    filter: SlotListFilter,
  ): Promise<{ items: Slot[]; totalItems: number }> {
    const query = this.repository.createQueryBuilder('slot');

    if (filter.status) {
      query.andWhere('slot.status = :status', { status: filter.status });
    }

    if (filter.type) {
      query.andWhere('slot.type = :type', { type: filter.type });
    }

    if (filter.floor !== undefined) {
      query.andWhere('slot.floor = :floor', { floor: filter.floor });
    }

    for (const rule of filter.sort) {
      query.addOrderBy(
        SORT_COLUMNS[rule.field] ?? 'slot.id',
        rule.direction === 'asc' ? 'ASC' : 'DESC',
      );
    }

    query.skip(filter.skip).take(filter.take);

    const [items, totalItems] = await query.getManyAndCount();

    return { items, totalItems };
  }

  async findById(id: number, manager?: EntityManager): Promise<Slot | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  async findByIdForUpdate(
    id: number,
    manager: EntityManager,
  ): Promise<Slot | null> {
    return manager
      .getRepository(Slot)
      .createQueryBuilder('slot')
      .setLock('pessimistic_write')
      .where('slot.id = :id', { id })
      .getOne();
  }

  async findByCode(
    code: string,
    excludeId?: number,
    manager?: EntityManager,
  ): Promise<Slot | null> {
    const query = this.repo(manager)
      .createQueryBuilder('slot')
      .where('UPPER(slot.code) = UPPER(:code)', { code });

    if (excludeId !== undefined) {
      query.andWhere('slot.id <> :excludeId', { excludeId });
    }

    return query.getOne();
  }

  async update(
    id: number,
    changes: Partial<Pick<Slot, 'code' | 'floor' | 'type' | 'status'>>,
    manager?: EntityManager,
  ): Promise<Slot | undefined> {
    const repo = this.repo(manager);
    const slot = await repo.findOne({ where: { id } });

    if (!slot) {
      return undefined;
    }

    Object.assign(slot, changes);

    return repo.save(slot);
  }
}
