import { SlotStatus, VehicleType } from '../common/enums';

export interface Slot {
  id: number;
  code: string;
  floor: number;
  type: VehicleType;
  status: SlotStatus;
}
