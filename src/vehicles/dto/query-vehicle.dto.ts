import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VehicleType } from '../../common/enums';

export class QueryVehicleDto {
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

  @IsOptional()
  @IsEnum(VehicleType, { message: 'type harus CAR atau MOTORCYCLE' })
  type?: VehicleType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'q harus berupa teks' })
  @MaxLength(100, { message: 'q maksimal 100 karakter' })
  q?: string;

  @IsOptional()
  @IsString({ message: 'sort harus berupa teks' })
  sort?: string;
}
