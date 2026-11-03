import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  VersionColumn,
} from 'typeorm';
import { VehicleType } from '../common/enums';
import { Ticket } from '../tickets/ticket.entity';

@Entity('vehicles')
@Check(
  'chk_vehicles_plate_number_length',
  `char_length("plate_number") BETWEEN 1 AND 12`,
)
@Check(
  'chk_vehicles_owner_name_length',
  `char_length("owner_name") BETWEEN 2 AND 100`,
)
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'plate_number',
    type: 'varchar',
    length: 12,
    unique: true,
  })
  plateNumber: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: VehicleType,
    enumName: 'vehicle_type',
  })
  type: VehicleType;

  @Column({ name: 'owner_name', type: 'varchar', length: 100 })
  ownerName: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @VersionColumn({ name: 'version', type: 'int', default: 1 })
  version: number;

  @OneToMany(() => Ticket, (ticket) => ticket.vehicle)
  tickets: Ticket[];
}
