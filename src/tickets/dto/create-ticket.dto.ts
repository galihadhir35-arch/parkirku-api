import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreateTicketDto {
  @Type(() => Number)
  @IsInt({ message: 'vehicleId harus bilangan bulat' })
  @Min(1, { message: 'vehicleId minimal 1' })
  vehicleId: number;

  @Type(() => Number)
  @IsInt({ message: 'slotId harus bilangan bulat' })
  @Min(1, { message: 'slotId minimal 1' })
  slotId: number;
}
