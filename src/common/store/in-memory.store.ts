import { Injectable } from '@nestjs/common';
import { Slot } from '../../slots/slot.model';
import { Ticket } from '../../tickets/ticket.model';
import { Vehicle } from '../../vehicles/vehicle.model';

interface StoreSnapshot {
  vehicles: Vehicle[];
  slots: Slot[];
  tickets: Ticket[];
  nextIds: { vehicle: number; slot: number; ticket: number };
}

/**
 * Penyimpanan in-memory untuk Tahap 1.
 * Tahap 2 akan mengganti repository ini dengan PostgreSQL/TypeORM.
 */
@Injectable()
export class InMemoryStore {
  vehicles: Vehicle[] = [];
  slots: Slot[] = [];
  tickets: Ticket[] = [];

  private nextIds = { vehicle: 1, slot: 1, ticket: 1 };

  nextVehicleId(): number {
    return this.nextIds.vehicle++;
  }

  nextSlotId(): number {
    return this.nextIds.slot++;
  }

  nextTicketId(): number {
    return this.nextIds.ticket++;
  }

  reset(): void {
    this.vehicles = [];
    this.slots = [];
    this.tickets = [];
    this.nextIds = { vehicle: 1, slot: 1, ticket: 1 };
  }

  /**
   * Meniru transaksi database: semua perubahan dibatalkan (rollback)
   * jika callback melempar error. Digunakan check-in dan check-out tiket.
   */
  transaction<T>(work: () => T): T {
    const snapshot = structuredClone<StoreSnapshot>({
      vehicles: this.vehicles,
      slots: this.slots,
      tickets: this.tickets,
      nextIds: this.nextIds,
    });

    try {
      return work();
    } catch (error) {
      this.vehicles = snapshot.vehicles;
      this.slots = snapshot.slots;
      this.tickets = snapshot.tickets;
      this.nextIds = snapshot.nextIds;
      throw error;
    }
  }
}
