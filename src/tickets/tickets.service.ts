import { Injectable } from '@nestjs/common';
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
import { Ticket } from './ticket.model';
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
  ) {}

  findAll(query: QueryTicketDto): CursorPage<TicketResponse> {
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

    const { items, nextCursor } = this.ticketsRepository.findMany({
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

  findOne(id: number): TicketResponse {
    return this.toResponse(this.getOrThrow(id));
  }

  /** Check-in: membuat tiket ACTIVE + mengubah slot menjadi OCCUPIED. */
  create(dto: CreateTicketDto): TicketResponse {
    const vehicle = this.vehiclesService.findEntityOrThrow(dto.vehicleId);

    if (this.ticketsRepository.hasActiveTicketForVehicle(vehicle.id)) {
      throw vehicleInUseProblem(
        `Kendaraan dengan plat nomor ${vehicle.plateNumber} masih memiliki tiket ACTIVE.`,
      );
    }

    const slot = this.slotsService.findEntityOrThrow(dto.slotId);

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

    const ticket = this.ticketsRepository.transaction(() => {
      const created = this.ticketsRepository.create({
        vehicleId: vehicle.id,
        slotId: slot.id,
        entryTime: new Date(),
      });

      this.slotsService.updateStatus(slot.id, SlotStatus.OCCUPIED);

      return created;
    });

    return this.toResponse(ticket);
  }

  /** Check-out: mengisi exitTime, fee, status COMPLETED, slot kembali AVAILABLE. */
  checkout(id: number, _dto: CheckoutTicketDto): TicketResponse {
    const ticket = this.getOrThrow(id);

    if (ticket.status !== TicketStatus.ACTIVE) {
      throw ticketAlreadyCompletedProblem(
        `Tiket dengan id ${id} sudah berstatus ${ticket.status}.`,
      );
    }

    const vehicle = this.vehiclesService.findEntityOrThrow(ticket.vehicleId);

    const completed = this.ticketsRepository.transaction(() => {
      const exitTime = new Date();
      const fee = calculateFee(vehicle.type, ticket.entryTime, exitTime);

      const updated = this.ticketsRepository.update(id, {
        exitTime,
        fee,
        status: TicketStatus.COMPLETED,
      });

      if (!updated) {
        throw notFoundProblem(`Tiket dengan id ${id} tidak ditemukan.`);
      }

      this.slotsService.updateStatus(ticket.slotId, SlotStatus.AVAILABLE);

      return updated;
    });

    return this.toResponse(completed);
  }

  private getOrThrow(id: number): Ticket {
    const ticket = this.ticketsRepository.findById(id);

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
