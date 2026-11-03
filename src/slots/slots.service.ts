import { Injectable } from '@nestjs/common';
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
import { Slot } from './slot.model';
import { SlotsRepository } from './slots.repository';

const SLOT_SORT_FIELDS = ['code', 'floor'] as const;

@Injectable()
export class SlotsService {
  constructor(private readonly slotsRepository: SlotsRepository) {}

  findAll(query: QuerySlotDto): OffsetPage<Slot> {
    const sort = parseSort(query.sort, SLOT_SORT_FIELDS, 'code');
    const { items, totalItems } = this.slotsRepository.findMany({
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

  findOne(id: number): Slot {
    return this.findEntityOrThrow(id);
  }

  create(dto: CreateSlotDto): Slot {
    this.assertCodeAvailable(dto.code);

    return this.slotsRepository.create({
      code: dto.code,
      floor: dto.floor,
      type: dto.type,
    });
  }

  patch(id: number, dto: PatchSlotDto): Slot {
    const slot = this.findEntityOrThrow(id);

    if (dto.code !== undefined) {
      this.assertCodeAvailable(dto.code, id);
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

    return this.slotsRepository.update(id, changes) ?? slot;
  }

  /** Dipakai TicketsService saat check-in/check-out. */
  findEntityOrThrow(id: number): Slot {
    const slot = this.slotsRepository.findById(id);

    if (!slot) {
      throw notFoundProblem(`Slot dengan id ${id} tidak ditemukan.`);
    }

    return slot;
  }

  /** Dipakai TicketsService di dalam transaksi check-in/check-out. */
  updateStatus(id: number, status: SlotStatus): Slot {
    const updated = this.slotsRepository.update(id, { status });

    if (!updated) {
      throw notFoundProblem(`Slot dengan id ${id} tidak ditemukan.`);
    }

    return updated;
  }

  private assertCodeAvailable(code: string, excludeId?: number): void {
    const existing = this.slotsRepository.findByCode(code, excludeId);

    if (existing) {
      throw duplicateSlotCodeProblem(code);
    }
  }
}
