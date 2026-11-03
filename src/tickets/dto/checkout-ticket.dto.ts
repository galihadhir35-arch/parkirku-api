import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../../common/enums';

export class CheckoutTicketDto {
  @ApiProperty({ enum: [TicketStatus.COMPLETED], example: 'COMPLETED' })
  @IsNotEmpty({ message: 'status tidak boleh kosong' })
  @IsIn([TicketStatus.COMPLETED], {
    message: 'status harus COMPLETED saat check-out',
  })
  status: TicketStatus.COMPLETED;
}
