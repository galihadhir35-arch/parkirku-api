import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateTicketDto {
  @ApiProperty({ description: 'ID kendaraan', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'vehicleId harus bilangan bulat' })
  @Min(1, { message: 'vehicleId minimal 1' })
  vehicleId: number;

  @ApiProperty({ description: 'ID slot', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'slotId harus bilangan bulat' })
  @Min(1, { message: 'slotId minimal 1' })
  slotId: number;
}
