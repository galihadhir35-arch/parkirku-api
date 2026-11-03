import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { SlotStatus } from '../../common/enums';
import { CreateSlotDto } from './create-slot.dto';

export class PatchSlotDto extends PartialType(CreateSlotDto) {
  @IsOptional()
  @IsEnum(SlotStatus, {
    message: 'status harus AVAILABLE, OCCUPIED, atau MAINTENANCE',
  })
  status?: SlotStatus;
}
