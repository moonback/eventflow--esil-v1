// ─── Existing types ───────────────────────────────────────────────────────────

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

// ─── CRM Module ───────────────────────────────────────────────────────────────

export type ClientStatus = 'prospect' | 'active' | 'vip' | 'inactive' | 'churned';
export type PipelineStageKey = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type DocumentStatus = 'draft' | 'sent' | 'signed' | 'archived';

export interface Client {
  id: string;
  name: string;           // Company / individual name
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  industry?: string;
  status: ClientStatus;
  pipelineStage: PipelineStageKey;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role?: string;          // e.g. "Event Manager", "CEO"
  isPrimary: boolean;
  createdAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  authorId: string;
  createdAt: string;
}

export interface ClientReminder {
  id: string;
  clientId: string;
  title: string;
  dueDate: string;
  done: boolean;
  createdAt: string;
}

export interface ClientDocument {
  id: string;
  clientId: string;
  name: string;
  url: string;
  status: DocumentStatus;
  uploadedAt: string;
}

export interface ClientRevenue {
  id: string;
  clientId: string;
  missionId?: string;
  amount: number;         // EUR
  description?: string;
  date: string;
}

export interface PipelineStage {
  key: PipelineStageKey;
  label: string;
  color: string;
  order: number;
}
