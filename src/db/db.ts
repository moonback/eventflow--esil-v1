import Dexie, { type Table } from 'dexie';
import { Mission, Equipment, MissionEquipment, Vehicle, Staff, Incident } from '../types';
import { supabase } from './supabase';

export class EventFlowDB extends Dexie {
  missions!: Table<Mission, string>;
  equipment!: Table<Equipment, string>;
  missionEquipment!: Table<MissionEquipment, [string, string]>; // [missionId, equipmentId]
  vehicles!: Table<Vehicle, string>;
  staff!: Table<Staff, string>;
  incidents!: Table<Incident, string>;

  constructor() {
    super('EventFlowDB');
    this.version(1).stores({
      missions: 'id, status, startDate',
      equipment: 'id, qrCode, category, status, currentMissionId',
      missionEquipment: '[missionId+equipmentId], missionId, equipmentId',
      vehicles: 'id, status',
      staff: 'id, role',
      incidents: 'id, missionId, status'
    });
  }
}

export const db = new EventFlowDB();

export async function initDb() {
  if (!supabase) {
    console.error("Supabase n'est pas configuré.");
    return;
  }
  
  await syncFromSupabase();
  setupRealtimeSubscriptions();
}

async function syncFromSupabase() {
  if (!supabase) return;

  try {
    const [
      { data: missions },
      { data: equipment },
      { data: missionEquipment },
      { data: vehicles },
      { data: profiles },
      { data: incidents }
    ] = await Promise.all([
      supabase.from('missions').select('*'),
      supabase.from('equipment').select('*'),
      supabase.from('mission_equipment').select('*'),
      supabase.from('vehicles').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('incidents').select('*')
    ]);

    await db.transaction('rw', [db.missions, db.equipment, db.missionEquipment, db.vehicles, db.staff, db.incidents], async () => {
      
      if (missions) {
        const mapped = missions.map(m => ({
          id: m.id, title: m.title, client: m.client, location: m.location, 
          startDate: m.start_date, endDate: m.end_date, status: m.status, 
          staffIds: m.staff_ids || [], vehicleId: m.vehicle_id, notes: m.notes
        }));
        await db.missions.clear();
        await db.missions.bulkPut(mapped);
      }
      
      if (equipment) {
        const mapped = equipment.map(e => ({
          id: e.id, qrCode: e.qr_code, name: e.name, brand: e.brand, 
          category: e.category, status: e.status, 
          currentMissionId: e.current_mission_id, weightKg: e.weight_kg
        }));
        await db.equipment.clear();
        await db.equipment.bulkPut(mapped);
      }

      if (missionEquipment) {
        const mapped = missionEquipment.map(me => ({
          missionId: me.mission_id, equipmentId: me.equipment_id,
          plannedQuantity: me.planned_quantity, loadedQuantity: me.loaded_quantity,
          returnedQuantity: me.returned_quantity, outScanTime: me.out_scan_time,
          inScanTime: me.in_scan_time
        }));
        await db.missionEquipment.clear();
        await db.missionEquipment.bulkPut(mapped);
      }

      if (vehicles) {
        const mapped = vehicles.map(v => ({
          id: v.id, plate: v.plate, model: v.model,
          capacityVolume: v.capacity_volume, capacityWeight: v.capacity_weight, status: v.status
        }));
        await db.vehicles.clear();
        await db.vehicles.bulkPut(mapped);
      }

      if (profiles) {
        const staff = profiles.map(p => ({
          id: p.id,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email,
          role: p.role,
        }));
        await db.staff.clear();
        await db.staff.bulkPut(staff);
      }

      if (incidents) {
        const mapped = incidents.map(i => ({
          id: i.id, missionId: i.mission_id, equipmentId: i.equipment_id,
          reportedBy: i.reported_by, description: i.description, status: i.status,
          createdAt: i.created_at
        }));
        await db.incidents.clear();
        await db.incidents.bulkPut(mapped);
      }
    });

    console.log("Synchronisation de Supabase vers Dexie terminée.");
  } catch (error) {
    console.error("Erreur lors de la synchronisation", error);
  }
}

function setupRealtimeSubscriptions() {
  if (!supabase) return;

  const channel = supabase.channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        // Simple strategy: re-fetch everything on change for this demo
        // For production, handle ADD/UPDATE/DELETE events specifically
        syncFromSupabase();
      }
    )
    .subscribe();
}

// Wrapper pour modifier Supabase et Dexie en un appel
export const dbMutations = {
  addMission: async (mission: Mission) => {
    if (supabase) {
      const { error } = await supabase.from('missions').insert({
        id: mission.id, title: mission.title, client: mission.client, location: mission.location,
        start_date: mission.startDate, end_date: mission.endDate, status: mission.status,
        staff_ids: mission.staffIds, vehicle_id: mission.vehicleId, notes: mission.notes
      });
      if (error) console.error(error);
    }
    await db.missions.add(mission);
  },
  
  updateMission: async (mission: Mission) => {
    if (supabase) {
      const { error } = await supabase.from('missions').update({
        title: mission.title, client: mission.client, location: mission.location,
        start_date: mission.startDate, end_date: mission.endDate, status: mission.status,
        staff_ids: mission.staffIds, vehicle_id: mission.vehicleId, notes: mission.notes
      }).eq('id', mission.id);
      if (error) console.error(error);
    }
    await db.missions.put(mission);
  },

  deleteMission: async (id: string) => {
    if (supabase) {
      const { error } = await supabase.from('missions').delete().eq('id', id);
      if (error) console.error(error);
    }
    await db.missions.delete(id);
  },

  updateMissionStatus: async (id: string, status: string) => {
    if (supabase) {
      await supabase.from('missions').update({ status }).eq('id', id);
    }
    await db.missions.update(id, { status: status as any });
  },

  addEquipment: async (eq: Equipment) => {
    if (supabase) {
      const { error } = await supabase.from('equipment').insert({
        id: eq.id, qr_code: eq.qrCode, name: eq.name, brand: eq.brand,
        category: eq.category, status: eq.status, weight_kg: eq.weightKg
      });
      if (error) console.error(error);
    }
    await db.equipment.add(eq);
  },

  updateEquipment: async (eq: Equipment) => {
    if (supabase) {
      const { error } = await supabase.from('equipment').update({
        name: eq.name, brand: eq.brand, category: eq.category,
        status: eq.status, weight_kg: eq.weightKg
      }).eq('id', eq.id);
      if (error) console.error(error);
    }
    await db.equipment.put(eq);
  },

  deleteEquipment: async (id: string) => {
    if (supabase) {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (error) console.error(error);
    }
    await db.equipment.delete(id);
  },

  updateEquipmentStatus: async (id: string, status: string, currentMissionId?: string) => {
    if (supabase) {
      await supabase.from('equipment').update({ status, current_mission_id: currentMissionId || null }).eq('id', id);
    }
    await db.equipment.update(id, { status: status as any, currentMissionId });
  },

  addIncident: async (incident: Incident) => {
    if (supabase) {
      await supabase.from('incidents').insert({
        id: incident.id, mission_id: incident.missionId, equipment_id: incident.equipmentId,
        reported_by: incident.reportedBy, description: incident.description, status: incident.status,
        created_at: incident.createdAt
      });
    }
    await db.incidents.add(incident);
  },

  addVehicle: async (vehicle: Vehicle) => {
    if (supabase) {
      await supabase.from('vehicles').insert({
        id: vehicle.id, plate: vehicle.plate, model: vehicle.model,
        capacity_volume: vehicle.capacityVolume, capacity_weight: vehicle.capacityWeight,
        status: vehicle.status
      });
    }
    await db.vehicles.add(vehicle);
  },

  updateVehicleStatus: async (id: string, status: string) => {
    if (supabase) {
      await supabase.from('vehicles').update({ status }).eq('id', id);
    }
    await db.vehicles.update(id, { status: status as any });
  },

  updateIncidentStatus: async (id: string, status: string) => {
    if (supabase) {
      await supabase.from('incidents').update({ status }).eq('id', id);
    }
    await db.incidents.update(id, { status: status as any });
  },

  updateMissionEquipment: async (missionId: string, equipmentId: string, updates: Partial<MissionEquipment>) => {
    if (supabase) {
      const payload: any = {};
      if (updates.loadedQuantity !== undefined) payload.loaded_quantity = updates.loadedQuantity;
      if (updates.returnedQuantity !== undefined) payload.returned_quantity = updates.returnedQuantity;
      if (updates.outScanTime !== undefined) payload.out_scan_time = updates.outScanTime;
      if (updates.inScanTime !== undefined) payload.in_scan_time = updates.inScanTime;
      
      await supabase.from('mission_equipment')
        .update(payload)
        .match({ mission_id: missionId, equipment_id: equipmentId });
    }
    
    await db.missionEquipment.where({ missionId, equipmentId }).modify(me => {
      Object.assign(me, updates);
    });
  }
};
