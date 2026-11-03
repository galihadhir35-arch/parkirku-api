import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TicketStatus } from '../common/enums';
import { Slot } from '../slots/slot.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

/**
 * Constraint/index parsial dibuat lewat migration (SQL mentah).
 * `synchronize: false` menandai bahwa TypeORM tidak boleh
 * membuat atau menghapusnya saat generate migration.
 */
@Entity('tickets')
@Check('chk_tickets_fee', `"fee" IS NULL OR "fee" >= 0`)
@Check(
  'chk_tickets_completion',
  `("status" = 'ACTIVE' AND "exit_time" IS NULL AND "fee" IS NULL)
   OR ("status" = 'COMPLETED' AND "exit_time" IS NOT NULL AND "fee" IS NOT NULL)`,
)
@Index('uq_tickets_active_vehicle', { synchronize: false })
@Index('uq_tickets_active_slot', { synchronize: false })
@Index('idx_tickets_entry_time_id', { synchronize: false })
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'vehicle_id', type: 'int' })
  vehicleId: number;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.tickets, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'vehicle_id',
    foreignKeyConstraintName: 'fk_tickets_vehicle',
  })
  vehicle: Vehicle;

  @Column({ name: 'slot_id', type: 'int' })
  slotId: number;

  @ManyToOne(() => Slot, (slot) => slot.tickets, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({
    name: 'slot_id',
    foreignKeyConstraintName: 'fk_tickets_slot',
  })
  slot: Slot;

  @Column({ name: 'entry_time', type: 'timestamptz' })
  entryTime: Date;

  @Column({ name: 'exit_time', type: 'timestamptz', nullable: true })
  exitTime: Date | null;

  @Column({ name: 'fee', type: 'int', nullable: true })
  fee: number | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TicketStatus,
    enumName: 'ticket_status',
    default: TicketStatus.ACTIVE,
  })
  status: TicketStatus;
}
