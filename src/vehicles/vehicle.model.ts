import { VehicleType } from '../common/enums';

export interface Vehicle {
  id: number;
  plateNumber: string;
  type: VehicleType;
  ownerName: string;
  createdAt: Date;
  version: number;
}
