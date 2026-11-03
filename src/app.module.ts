import { Module } from '@nestjs/common';
import { InMemoryStoreModule } from './common/store/in-memory-store.module';
import { SlotsModule } from './slots/slots.module';
import { TicketsModule } from './tickets/tickets.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    InMemoryStoreModule,
    VehiclesModule,
    SlotsModule,
    TicketsModule,
  ],
})
export class AppModule {}
