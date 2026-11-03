import { Module, forwardRef } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesRepository } from './vehicles.repository';
import { VehiclesService } from './vehicles.service';

@Module({
  // VehiclesService perlu membaca tiket ACTIVE lewat TicketsRepository.
  // forwardRef dipakai karena TicketsModule juga membutuhkan VehiclesService.
  imports: [forwardRef(() => TicketsModule)],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehiclesRepository],
  exports: [VehiclesService, VehiclesRepository],
})
export class VehiclesModule {}
