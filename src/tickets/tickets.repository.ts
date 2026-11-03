import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TicketStatus } from '../common/enums';
import {
  TicketCursor,
  encodeTicketCursor,
} from '../common/utils/cursor';
import { SortRule } from '../common/utils/sort';
import { Ticket } from './ticket.entity';

export interface TicketListFilter {
  status?: TicketStatus;
  vehicleId?: number;
  from?: Date;
  to?: Date;
  sort: SortRule[];
  limit: number;
  cursor?: TicketCursor;
}

const SORT_COLUMNS: Record<string, string> = {
  entryTime: 'ticket.entry_time',
  fee: 'ticket.fee',
  id: 'ticket.id',
};

@Injectable()
export class TicketsRepository {
  constructor(
    @InjectRepository(Ticket)
    private readonly repository: Repository<Ticket>,
  ) {}

  private repo(manager?: EntityManager): Repository<Ticket> {
    return manager ? manager.getRepository(Ticket) : this.repository;
  }

  async create(
    data: { vehicleId: number; slotId: number; entryTime: Date },
    manager?: EntityManager,
  ): Promise<Ticket> {
    return this.repo(manager).save(
      this.repo(manager).create({
        ...data,
        exitTime: null,
        fee: null,
        status: TicketStatus.ACTIVE,
      }),
    );
  }

  async findMany(filter: TicketListFilter): Promise<{
    items: Ticket[];
    nextCursor: string | null;
  }> {
    const query = this.repository.createQueryBuilder('ticket');

    if (filter.status) {
      query.andWhere('ticket.status = :status', { status: filter.status });
    }

    if (filter.vehicleId !== undefined) {
      query.andWhere('ticket.vehicle_id = :vehicleId', {
        vehicleId: filter.vehicleId,
      });
    }

    if (filter.from) {
      query.andWhere('ticket.entry_time >= :from', { from: filter.from });
    }

    if (filter.to) {
      query.andWhere('ticket.entry_time <= :to', { to: filter.to });
    }

    if (filter.cursor) {
      // Perbandingan pasangan (entry_time, id) sesuai kontrak cursor.
      query.andWhere(
        '(ticket.entry_time, ticket.id) < (:entryTime, :cursorId)',
        {
          entryTime: filter.cursor.entryTime,
          cursorId: filter.cursor.id,
        },
      );
    }

    for (const rule of filter.sort) {
      query.addOrderBy(
        SORT_COLUMNS[rule.field] ?? 'ticket.id',
        rule.direction === 'asc' ? 'ASC' : 'DESC',
      );
    }

    query.limit(filter.limit + 1);

    const window = await query.getMany();
    const hasMore = window.length > filter.limit;
    const items = window.slice(0, filter.limit);
    const last = items[items.length - 1];

    return {
      items,
      nextCursor:
        hasMore && last
          ? encodeTicketCursor(last.entryTime, last.id)
          : null,
    };
  }

  async findById(id: number, manager?: EntityManager): Promise<Ticket | null> {
    return this.repo(manager).findOne({ where: { id } });
  }

  async findByIdForUpdate(
    id: number,
    manager: EntityManager,
  ): Promise<Ticket | null> {
    return manager
      .getRepository(Ticket)
      .createQueryBuilder('ticket')
      .setLock('pessimistic_write')
      .where('ticket.id = :id', { id })
      .getOne();
  }

  async hasActiveTicketForVehicle(
    vehicleId: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const count = await this.repo(manager).count({
      where: { vehicleId, status: TicketStatus.ACTIVE },
    });

    return count > 0;
  }

  async update(
    id: number,
    changes: Partial<Pick<Ticket, 'exitTime' | 'fee' | 'status'>>,
    manager?: EntityManager,
  ): Promise<Ticket | undefined> {
    const repo = this.repo(manager);
    const ticket = await repo.findOne({ where: { id } });

    if (!ticket) {
      return undefined;
    }

    Object.assign(ticket, changes);

    return repo.save(ticket);
  }
}
