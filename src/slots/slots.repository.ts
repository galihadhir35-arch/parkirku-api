import { Injectable } from '@nestjs/common';
import { SlotStatus, VehicleType } from '../common/enums';
import { InMemoryStore } from '../common/store/in-memory.store';
import { SortRule, compareByRules } from '../common/utils/sort';
import { Slot } from './slot.model';

export interface SlotListFilter {
  status?: SlotStatus;
  type?: VehicleType;
  floor?: number;
  sort: SortRule[];
  skip: number;
  take: number;
}

@Injectable()
export class SlotsRepository {
  constructor(private readonly store: InMemoryStore) {}

  create(data: {
    code: string;
    floor: number;
    type: VehicleType;
  }): Slot {
    const slot: Slot = {
      id: this.store.nextSlotId(),
      code: data.code,
      floor: data.floor,
      type: data.type,
      status: SlotStatus.AVAILABLE,
    };

    this.store.slots.push(slot);

    return slot;
  }

  findMany(filter: SlotListFilter): { items: Slot[]; totalItems: number } {
    const items = this.store.slots.filter((slot) => {
      if (filter.status && slot.status !== filter.status) {
        return false;
      }
      if (filter.type && slot.type !== filter.type) {
        return false;
      }
      if (filter.floor !== undefined && slot.floor !== filter.floor) {
        return false;
      }

      return true;
    });

    items.sort((left, right) => compareByRules(left, right, filter.sort));

    return {
      items: items.slice(filter.skip, filter.skip + filter.take),
      totalItems: items.length,
    };
  }

  findById(id: number): Slot | undefined {
    return this.store.slots.find((slot) => slot.id === id);
  }

  findByCode(code: string, excludeId?: number): Slot | undefined {
    const normalized = code.toUpperCase();

    return this.store.slots.find(
      (slot) =>
        slot.code.toUpperCase() === normalized && slot.id !== excludeId,
    );
  }

  update(
    id: number,
    changes: Partial<Pick<Slot, 'code' | 'floor' | 'type' | 'status'>>,
  ): Slot | undefined {
    const slot = this.findById(id);

    if (!slot) {
      return undefined;
    }

    Object.assign(slot, changes);

    return slot;
  }
}
