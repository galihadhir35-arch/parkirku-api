import { Injectable } from '@nestjs/common';
import { TicketStatus } from '../common/enums';
import { InMemoryStore } from '../common/store/in-memory.store';
import {
  TicketCursor,
  encodeTicketCursor,
} from '../common/utils/cursor';
import { SortRule, compareByRules } from '../common/utils/sort';
import { Ticket } from './ticket.model';

export interface TicketListFilter {
  status?: TicketStatus;
  vehicleId?: number;
  from?: Date;
  to?: Date;
  sort: SortRule[];
  limit: number;
  cursor?: TicketCursor;
}

@Injectable()
export class TicketsRepository {
  constructor(private readonly store: InMemoryStore) {}

  create(data: {
    vehicleId: number;
    slotId: number;
    entryTime: Date;
  }): Ticket {
    const ticket: Ticket = {
      id: this.store.nextTicketId(),
      vehicleId: data.vehicleId,
      slotId: data.slotId,
      entryTime: data.entryTime,
      exitTime: null,
      fee: null,
      status: TicketStatus.ACTIVE,
    };

    this.store.tickets.push(ticket);

    return ticket;
  }

  findMany(filter: TicketListFilter): {
    items: Ticket[];
    nextCursor: string | null;
  } {
    let items = this.store.tickets.filter((ticket) => {
      if (filter.status && ticket.status !== filter.status) {
        return false;
      }
      if (
        filter.vehicleId !== undefined &&
        ticket.vehicleId !== filter.vehicleId
      ) {
        return false;
      }
      if (filter.from && ticket.entryTime < filter.from) {
        return false;
      }
      if (filter.to && ticket.entryTime > filter.to) {
        return false;
      }

      return true;
    });

    if (filter.cursor) {
      // Cursor memakai perbandingan pasangan (entry_time, id), sesuai kontrak.
      items = items.filter(
        (ticket) =>
          ticket.entryTime.getTime() < filter.cursor!.entryTime.getTime() ||
          (ticket.entryTime.getTime() ===
            filter.cursor!.entryTime.getTime() &&
            ticket.id < filter.cursor!.id),
      );
    }

    items.sort((left, right) => compareByRules(left, right, filter.sort));

    const window = items.slice(0, filter.limit + 1);
    const hasMore = window.length > filter.limit;
    const page = window.slice(0, filter.limit);
    const last = page[page.length - 1];

    return {
      items: page,
      nextCursor:
        hasMore && last
          ? encodeTicketCursor(last.entryTime, last.id)
          : null,
    };
  }

  findById(id: number): Ticket | undefined {
    return this.store.tickets.find((ticket) => ticket.id === id);
  }

  hasActiveTicketForVehicle(vehicleId: number): boolean {
    return this.store.tickets.some(
      (ticket) =>
        ticket.vehicleId === vehicleId &&
        ticket.status === TicketStatus.ACTIVE,
    );
  }

  update(
    id: number,
    changes: Partial<Pick<Ticket, 'exitTime' | 'fee' | 'status'>>,
  ): Ticket | undefined {
    const ticket = this.findById(id);

    if (!ticket) {
      return undefined;
    }

    Object.assign(ticket, changes);

    return ticket;
  }

  transaction<T>(work: () => T): T {
    return this.store.transaction(work);
  }
}
