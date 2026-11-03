import { IsIn, IsNotEmpty } from 'class-validator';
import { TicketStatus } from '../../common/enums';

export class CheckoutTicketDto {
  @IsNotEmpty({ message: 'status tidak boleh kosong' })
  @IsIn([TicketStatus.COMPLETED], {
    message: 'status harus COMPLETED saat check-out',
  })
  status: TicketStatus.COMPLETED;
}
