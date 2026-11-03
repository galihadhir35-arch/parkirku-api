import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SlotStatus } from '../common/enums';
import {
  duplicateSlotCodeProblem,
  notFoundProblem,
  slotOccupiedProblem,
} from '../common/errors/problem-details';
import { OffsetPage, buildOffsetMeta } from '../common/utils/pagination';
import { parseSort } from '../common/utils/sort';
import { CreateSlotDto } from './dto/create-slot.dto';
import { PatchSlotDto } from './dto/patch-slot.dto';
import { QuerySlotDto } from './dto/query-slot.dto';
import { Slot } from './slot.entity';
import { SlotsRepository } from './slots.repository';

const SLOT_SORT_FIELDS = ['code', 'floor'] as const;

@Injectable()
export class SlotsService {
  constructor(private readonly slotsRepository: SlotsRepository) {}

  async findAll(query: QuerySlotDto): Promise<OffsetPage<Slot>> {
    const sort = parseSort(query.sort, SLOT_SORT_FIELDS, 'code');
    const { items, totalItems } = await this.slotsRepository.findMany({
      status: query.status,
      type: query.type,
      floor: query.floor,
      sort,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: items,
      meta: buildOffsetMeta(query.page, query.limit, totalItems),
    };
  }

  async findOne(id: number): Promise<Slot> {
    return this.findEntityOrThrow(id);
  }

  async create(dto: CreateSlotDto): Promise<Slot> {
    await this.assertCodeAvailable(dto.code);

    return this.slotsRepository.create({
      code: dto.code,
      floor: dto.floor,
      type: dto.type,
    });
  }

  async patch(id: number, dto: PatchSlotDto): Promise<Slot> {
    const slot = await this.findEntityOrThrow(id);

    if (dto.code !== undefined) {
      await this.assertCodeAvailable(dto.code, id);
    }

    if (
      slot.status === SlotStatus.OCCUPIED &&
      dto.status === SlotStatus.MAINTENANCE
    ) {
      throw slotOccupiedProblem(
        `Slot ${slot.code} sedang OCCUPIED dan tidak dapat diubah ke MAINTENANCE.`,
      );
    }

    const changes: Partial<Pick<Slot, 'code' | 'floor' | 'type' | 'status'>> = {};

    if (dto.code !== undefined) {
      changes.code = dto.code;
    }
    if (dto.floor !== undefined) {
      changes.floor = dto.floor;
    }
    if (dto.type !== undefined) {
      changes.type = dto.type;
    }
    if (dto.status !== undefined) {
      changes.status = dto.status;
    }

    return (await this.slotsRepository.update(id, changes)) ?? slot;
  }

  /** Dipakai TicketsService di dalam transaksi check-in/check-out. */
  async findEntityOrThrow(
    id: number,
    manager?: EntityManager,
  ): Promise<Slot> {
    const slot = await this.slotsRepository.findById(id, manager);

    if (!slot) {
      throw notFoundProblem(`Slot dengan id ${id} tidak ditemukan.`);
    }

    return slot;
  }

  /**
   * Mengunci baris slot (SELECT ... FOR UPDATE) saat check-in agar dua
   * request bersamaan tidak memakai slot yang sama.
   */
  async findEntityForUpdateOrThrow(
    id: number,
    manager: EntityManager,
  ): Promise<Slot> {
    const slot = await this.slotsRepository.findByIdForUpdate(id, manager);

    if (!slot) {
      throw notFoundProblem(`Slot dengan id ${id} tidak ditemukan.`);
    }

    return slot;
  }

  /** Dipakai TicketsService di dalam transaksi check-in/check-out. */
  async updateStatus(
    id: number,
    status: SlotStatus,
    manager?: EntityManager,
  ): Promise<Slot> {
    const updated = await this.slotsRepository.update(
      id,
      { status },
      manager,
    );

    if (!updated) {
      throw notFoundProblem(`Slot dengan id ${id} tidak ditemukan.`);
    }

    return updated;
  }

  private async assertCodeAvailable(
    code: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.slotsRepository.findByCode(code, excludeId);

    if (existing) {
      throw duplicateSlotCodeProblem(code);
    }
  }
}
