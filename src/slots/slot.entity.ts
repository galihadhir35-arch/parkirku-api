import {
  Check,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SlotStatus, VehicleType } from '../common/enums';
import { Ticket } from '../tickets/ticket.entity';

@Entity('slots')
@Check('chk_slots_code_length', `char_length("code") BETWEEN 1 AND 20`)
@Check('chk_slots_floor', `"floor" >= 1`)
export class Slot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code', type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ name: 'floor', type: 'int' })
  floor: number;

  @Column({
    name: 'type',
    type: 'enum',
    enum: VehicleType,
    enumName: 'vehicle_type',
  })
  type: VehicleType;

  @Column({
    name: 'status',
    type: 'enum',
    enum: SlotStatus,
    enumName: 'slot_status',
    default: SlotStatus.AVAILABLE,
  })
  status: SlotStatus;

  @OneToMany(() => Ticket, (ticket) => ticket.slot)
  tickets: Ticket[];
}
