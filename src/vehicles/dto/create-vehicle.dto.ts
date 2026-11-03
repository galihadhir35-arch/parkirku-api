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
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString({ message: 'plateNumber harus berupa teks' })
  @IsNotEmpty({ message: 'plateNumber tidak boleh kosong' })
  @MaxLength(12, { message: 'plateNumber maksimal 12 karakter' })
  plateNumber: string;

  @IsEnum(VehicleType, { message: 'type harus CAR atau MOTORCYCLE' })
  type: VehicleType;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'ownerName harus berupa teks' })
  @IsNotEmpty({ message: 'ownerName tidak boleh kosong' })
  @Length(2, 100, { message: 'ownerName harus 2-100 karakter' })
  ownerName: string;
}
