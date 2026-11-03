import { PartialType } from '@nestjs/mapped-types';
import { CreateVehicleDto } from './create-vehicle.dto';

export class PatchVehicleDto extends PartialType(CreateVehicleDto) {}
