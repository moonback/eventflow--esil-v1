export type MissionStatus = 'planned' | 'loading' | 'en_route' | 'installing' | 'live' | 'dismantling' | 'returning' | 'completed';

export type EquipmentStatus = 'warehouse' | 'on_mission' | 'maintenance' | 'lost';
export type EquipmentCategory = 'audio' | 'lighting' | 'video' | 'structure' | 'power' | 'furniture';

export interface Mission {
  id: string;
  title: string;
  client: string;
  location: string;
  startDate: string;
  endDate: string;
  status: MissionStatus;
  staffIds: string[];
  vehicleId: string | null;
  notes?: string;
}

export interface Equipment {
  id: string;
  qrCode: string;
  name: string;
  brand: string;
  category: EquipmentCategory;
  status: EquipmentStatus;
  currentMissionId?: string;
  weightKg?: number;
}

export interface MissionEquipment {
  missionId: string;
  equipmentId: string;
  plannedQuantity: number;
  loadedQuantity: number;
  returnedQuantity: number;
  outScanTime?: string;
  inScanTime?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  capacityVolume: number; // m3
  capacityWeight: number; // kg
  status: 'available' | 'on_mission' | 'maintenance';
}

export interface Staff {
  id: string;
  name: string;
  role: 'dispatcher' | 'technician' | 'driver' | 'manager';
  phone?: string;
}

export interface Incident {
  id: string;
  missionId: string;
  equipmentId?: string;
  reportedBy: string;
  description: string;
  status: 'open' | 'resolved';
  createdAt: string;
}
