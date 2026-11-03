import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ description: 'Kode slot', example: 'A-01', maxLength: 20 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'code harus berupa teks' })
  @IsNotEmpty({ message: 'code tidak boleh kosong' })
  code: string;

  @ApiProperty({ description: 'Lantai slot', example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'floor harus bilangan bulat' })
  @Min(1, { message: 'floor minimal 1' })
  floor: number;

  @ApiProperty({ description: 'Tipe slot', enum: VehicleType, example: 'CAR' })
  @IsEnum(VehicleType, { message: 'type harus CAR atau MOTORCYCLE' })
  type: VehicleType;
}
