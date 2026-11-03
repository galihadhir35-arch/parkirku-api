import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Slot } from '../slots/slot.entity';
import { Ticket } from '../tickets/ticket.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

export function buildTypeOrmOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: config.get<number>('DB_PORT', 5432),
    username: config.get<string>('DB_USER', 'parkirku'),
    password: config.get<string>('DB_PASSWORD', 'parkirku'),
    database: config.get<string>('DB_NAME', 'parkirku'),
    entities: [Vehicle, Slot, Ticket],
    synchronize: false,
    logging: false,
  };
}
