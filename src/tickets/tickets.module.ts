import { Module, forwardRef } from '@nestjs/common';
import { SlotsModule } from '../slots/slots.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

@Module({
  imports: [forwardRef(() => VehiclesModule), SlotsModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService, TicketsRepository],
})
export class TicketsModule {}
