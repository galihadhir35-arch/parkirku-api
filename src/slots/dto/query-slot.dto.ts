import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SlotStatus, VehicleType } from '../../common/enums';

export class QuerySlotDto {
  @ApiProperty({ required: false, enum: SlotStatus, description: 'Filter status' })
  @IsOptional()
  @IsEnum(SlotStatus, {
    message: 'status harus AVAILABLE, OCCUPIED, atau MAINTENANCE',
  })
  status?: SlotStatus;

  @ApiProperty({ required: false, enum: VehicleType, description: 'Filter tipe' })
  @IsOptional()
  @IsEnum(VehicleType, { message: 'type harus CAR atau MOTORCYCLE' })
  type?: VehicleType;

  @ApiProperty({ required: false, description: 'Filter lantai' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'floor harus bilangan bulat' })
  @Min(1, { message: 'floor minimal 1' })
  floor?: number;

  @ApiProperty({ required: false, description: 'Sort, contoh code,-floor' })
  @IsOptional()
  @IsString({ message: 'sort harus berupa teks' })
  sort?: string;

  @ApiProperty({ required: false, default: 1, description: 'Halaman' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus bilangan bulat' })
  @Min(1, { message: 'page minimal 1' })
  page: number = 1;

  @ApiProperty({ required: false, default: 10, description: 'Jumlah per halaman' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat' })
  @Min(1, { message: 'limit minimal 1' })
  @Max(100, { message: 'limit maksimal 100' })
  limit: number = 10;
}
