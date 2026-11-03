import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { SlotStatus, TicketStatus } from '../common/enums';
import {
  invalidQueryProblem,
  notFoundProblem,
  slotOccupiedProblem,
  ticketAlreadyCompletedProblem,
  vehicleInUseProblem,
} from '../common/errors/problem-details';
import { decodeTicketCursor } from '../common/utils/cursor';
import { parseSort } from '../common/utils/sort';
import { SlotsService } from '../slots/slots.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CheckoutTicketDto } from './dto/checkout-ticket.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { calculateFee } from './ticket-fee';
import { Ticket } from './ticket.entity';
import { TicketsRepository } from './tickets.repository';

export interface TicketResponse {
  id: number;
  vehicleId: number;
  slotId: number;
  entryTime: string;
  exitTime: string | null;
  fee: number | null;
  status: TicketStatus;
}

export interface CursorPage<T> {
  data: T[];
  meta: {
    limit: number;
    nextCursor: string | null;
  };
}

const TICKET_SORT_FIELDS = ['entryTime', 'fee'] as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly ticketsRepository: TicketsRepository,
    private readonly vehiclesService: VehiclesService,
    private readonly slotsService: SlotsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async findAll(query: QueryTicketDto): Promise<CursorPage<TicketResponse>> {
    if (query.cursor !== undefined && query.sort !== undefined) {
      throw invalidQueryProblem(
        'Parameter sort tidak dapat digabung dengan cursor.',
      );
    }

    const from = query.from ? this.parseDate(query.from, false) : undefined;
    const to = query.to ? this.parseDate(query.to, true) : undefined;

    if (from && to && from > to) {
      throw invalidQueryProblem(
        'Parameter from tidak boleh setelah parameter to.',
      );
    }

    const sort = query.cursor
      ? [
          { field: 'entryTime', direction: 'desc' as const },
          { field: 'id', direction: 'desc' as const },
        ]
      : parseSort(query.sort, TICKET_SORT_FIELDS, '-entryTime');

    const { items, nextCursor } = await this.ticketsRepository.findMany({
      status: query.status,
      vehicleId: query.vehicleId,
      from,
      to,
      sort,
      limit: query.limit,
      cursor: query.cursor ? decodeTicketCursor(query.cursor) : undefined,
    });

    return {
      data: items.map((ticket) => this.toResponse(ticket)),
      meta: { limit: query.limit, nextCursor },
    };
  }

  async findOne(id: number): Promise<TicketResponse> {
    return this.toResponse(await this.getOrThrow(id));
  }

  /**
   * Check-in dalam satu transaksi:
   * kunci baris slot, buat tiket ACTIVE, ubah slot menjadi OCCUPIED.
   */
  async create(dto: CreateTicketDto): Promise<TicketResponse> {
    const vehicle = await this.vehiclesService.findEntityOrThrow(dto.vehicleId);

    return this.dataSource.transaction(async (manager) => {
      const slot = await this.slotsService.findEntityForUpdateOrThrow(
        dto.slotId,
        manager,
      );

      if (
        await this.ticketsRepository.hasActiveTicketForVehicle(
          vehicle.id,
          manager,
        )
      ) {
        throw vehicleInUseProblem(
          `Kendaraan dengan plat nomor ${vehicle.plateNumber} masih memiliki tiket ACTIVE.`,
        );
      }

      if (slot.type !== vehicle.type) {
        throw slotOccupiedProblem(
          `Slot ${slot.code} bertipe ${slot.type} tidak cocok dengan kendaraan bertipe ${vehicle.type}.`,
        );
      }

      if (slot.status !== SlotStatus.AVAILABLE) {
        throw slotOccupiedProblem(
          `Slot ${slot.code} berstatus ${slot.status} sehingga tidak dapat digunakan.`,
        );
      }

      const ticket = await this.ticketsRepository.create(
        {
          vehicleId: vehicle.id,
          slotId: slot.id,
          entryTime: new Date(),
        },
        manager,
      );

      await this.slotsService.updateStatus(
        slot.id,
        SlotStatus.OCCUPIED,
        manager,
      );

      return this.toResponse(ticket);
    });
  }

  /**
   * Check-out dalam satu transaksi:
   * isi exitTime/fee, ubah tiket menjadi COMPLETED, slot kembali AVAILABLE.
   */
  async checkout(
    id: number,
    _dto: CheckoutTicketDto,
  ): Promise<TicketResponse> {
    return this.dataSource.transaction(async (manager) => {
      const ticket = await this.getOrThrowForUpdate(id, manager);

      if (ticket.status !== TicketStatus.ACTIVE) {
        throw ticketAlreadyCompletedProblem(
          `Tiket dengan id ${id} sudah berstatus ${ticket.status}.`,
        );
      }

      const vehicle = await this.vehiclesService.findEntityOrThrow(
        ticket.vehicleId,
        manager,
      );

      const exitTime = new Date();
      const fee = calculateFee(vehicle.type, ticket.entryTime, exitTime);

      const updated = await this.ticketsRepository.update(
        id,
        { exitTime, fee, status: TicketStatus.COMPLETED },
        manager,
      );

      if (!updated) {
        throw notFoundProblem(`Tiket dengan id ${id} tidak ditemukan.`);
      }

      await this.slotsService.updateStatus(
        ticket.slotId,
        SlotStatus.AVAILABLE,
        manager,
      );

      return this.toResponse(updated);
    });
  }

  private async getOrThrow(id: number): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findById(id);

    if (!ticket) {
      throw notFoundProblem(`Tiket dengan id ${id} tidak ditemukan.`);
    }

    return ticket;
  }

  private async getOrThrowForUpdate(
    id: number,
    manager: EntityManager,
  ): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findByIdForUpdate(id, manager);

    if (!ticket) {
      throw notFoundProblem(`Tiket dengan id ${id} tidak ditemukan.`);
    }

    return ticket;
  }

  private parseDate(raw: string, endOfDay: boolean): Date {
    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      throw invalidQueryProblem(`Tanggal '${raw}' tidak valid.`);
    }

    // Jika hanya tanggal (YYYY-MM-DD), `to` mencakup seluruh hari tersebut.
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      date.setUTCHours(23, 59, 59, 999);
    }

    return date;
  }

  private toResponse(ticket: Ticket): TicketResponse {
    return {
      id: ticket.id,
      vehicleId: ticket.vehicleId,
      slotId: ticket.slotId,
      entryTime: ticket.entryTime.toISOString(),
      exitTime: ticket.exitTime ? ticket.exitTime.toISOString() : null,
      fee: ticket.fee,
      status: ticket.status,
    };
  }
}
