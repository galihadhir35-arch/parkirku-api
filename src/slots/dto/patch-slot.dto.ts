import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { SlotStatus } from '../../common/enums';
import { CreateSlotDto } from './create-slot.dto';

export class PatchSlotDto extends PartialType(CreateSlotDto) {
  @ApiProperty({ required: false, enum: SlotStatus, description: 'Status slot' })
  @IsOptional()
  @IsEnum(SlotStatus, {
    message: 'status harus AVAILABLE, OCCUPIED, atau MAINTENANCE',
  })
  status?: SlotStatus;
}
