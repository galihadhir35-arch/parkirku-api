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
  @IsOptional()
  @IsEnum(SlotStatus, {
    message: 'status harus AVAILABLE, OCCUPIED, atau MAINTENANCE',
  })
  status?: SlotStatus;

  @IsOptional()
  @IsEnum(VehicleType, { message: 'type harus CAR atau MOTORCYCLE' })
  type?: VehicleType;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'floor harus bilangan bulat' })
  @Min(1, { message: 'floor minimal 1' })
  floor?: number;

  @IsOptional()
  @IsString({ message: 'sort harus berupa teks' })
  sort?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page harus bilangan bulat' })
  @Min(1, { message: 'page minimal 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat' })
  @Min(1, { message: 'limit minimal 1' })
  @Max(100, { message: 'limit maksimal 100' })
  limit: number = 10;
}
