import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Slot } from './slot.entity';
import { SlotsController } from './slots.controller';
import { SlotsRepository } from './slots.repository';
import { SlotsService } from './slots.service';

@Module({
  imports: [TypeOrmModule.forFeature([Slot])],
  controllers: [SlotsController],
  providers: [SlotsService, SlotsRepository],
  exports: [SlotsService, SlotsRepository],
})
export class SlotsModule {}
