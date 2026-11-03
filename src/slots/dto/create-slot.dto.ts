import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';
import { VehicleType } from '../../common/enums';

export class CreateSlotDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'code harus berupa teks' })
  @IsNotEmpty({ message: 'code tidak boleh kosong' })
  code: string;

  @Type(() => Number)
  @IsInt({ message: 'floor harus bilangan bulat' })
  @Min(1, { message: 'floor minimal 1' })
  floor: number;

  @IsEnum(VehicleType, { message: 'type harus CAR atau MOTORCYCLE' })
  type: VehicleType;
}
