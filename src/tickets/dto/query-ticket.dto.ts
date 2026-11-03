import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ required: false, enum: TicketStatus, description: 'Filter status' })
  @IsOptional()
  @IsEnum(TicketStatus, { message: 'status harus ACTIVE atau COMPLETED' })
  status?: TicketStatus;

  @ApiProperty({ required: false, description: 'Filter kendaraan' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'vehicleId harus bilangan bulat' })
  @Min(1, { message: 'vehicleId minimal 1' })
  vehicleId?: number;

  @ApiProperty({ required: false, description: 'Filter entry dari tanggal (ISO 8601)' })
  @IsOptional()
  @IsISO8601({}, { message: 'from harus berformat ISO 8601' })
  from?: string;

  @ApiProperty({ required: false, description: 'Filter entry sampai tanggal (ISO 8601)' })
  @IsOptional()
  @IsISO8601({}, { message: 'to harus berformat ISO 8601' })
  to?: string;

  @ApiProperty({ required: false, description: 'Sort, contoh -entryTime' })
  @IsOptional()
  @IsString({ message: 'sort harus berupa teks' })
  sort?: string;

  @ApiProperty({ required: false, default: 10, description: 'Jumlah per halaman' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat' })
  @Min(1, { message: 'limit minimal 1' })
  @Max(100, { message: 'limit maksimal 100' })
  limit: number = 10;

  @ApiProperty({ required: false, description: 'Cursor halaman berikutnya' })
  @IsOptional()
  @IsString({ message: 'cursor harus berupa teks' })
  @MaxLength(500, { message: 'cursor maksimal 500 karakter' })
  cursor?: string;
}
