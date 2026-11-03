import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { VehicleType } from '../../common/enums';

export class CreateVehicleDto {
  @ApiProperty({ description: 'Nomor plat kendaraan', example: 'B 1001 XY', maxLength: 12 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'plateNumber harus berupa teks' })
  @IsNotEmpty({ message: 'plateNumber tidak boleh kosong' })
  @MaxLength(12, { message: 'plateNumber maksimal 12 karakter' })
  plateNumber: string;

  @ApiProperty({ description: 'Tipe kendaraan', enum: VehicleType, example: 'CAR' })
  @IsEnum(VehicleType, { message: 'type harus CAR atau MOTORCYCLE' })
  type: VehicleType;

  @ApiProperty({ description: 'Nama pemilik', example: 'Budi Santoso', minLength: 2, maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'ownerName harus berupa teks' })
  @IsNotEmpty({ message: 'ownerName tidak boleh kosong' })
  @Length(2, 100, { message: 'ownerName harus 2-100 karakter' })
  ownerName: string;
}
