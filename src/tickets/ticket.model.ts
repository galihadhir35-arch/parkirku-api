import { TicketStatus } from '../common/enums';

export interface Ticket {
  id: number;
  vehicleId: number;
  slotId: number;
  entryTime: Date;
  exitTime: Date | null;
  fee: number | null;
  status: TicketStatus;
}
