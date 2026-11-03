import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TicketStatus } from '../../common/enums';

export class QueryTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus, { message: 'status harus ACTIVE atau COMPLETED' })
  status?: TicketStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'vehicleId harus bilangan bulat' })
  @Min(1, { message: 'vehicleId minimal 1' })
  vehicleId?: number;

  @IsOptional()
  @IsISO8601({}, { message: 'from harus berformat ISO 8601' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'to harus berformat ISO 8601' })
  to?: string;

  @IsOptional()
  @IsString({ message: 'sort harus berupa teks' })
  sort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat' })
  @Min(1, { message: 'limit minimal 1' })
  @Max(100, { message: 'limit maksimal 100' })
  limit: number = 10;

  @IsOptional()
  @IsString({ message: 'cursor harus berupa teks' })
  @MaxLength(500, { message: 'cursor maksimal 500 karakter' })
  cursor?: string;
}
