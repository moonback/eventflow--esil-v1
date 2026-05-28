import Dexie, { type Table } from 'dexie';
import { Mission, Equipment, MissionEquipment, Vehicle, Staff, Incident, Client, Contact, ClientNote, ClientReminder, ClientDocument, ClientRevenue, Quote, QuoteItem, Invoice } from '../types';
import { supabase } from './supabase';

export class EventFlowDB extends Dexie {
  missions!: Table<Mission, string>;
  equipment!: Table<Equipment, string>;
  missionEquipment!: Table<MissionEquipment, [string, string]>; // [missionId, equipmentId]
  vehicles!: Table<Vehicle, string>;
  staff!: Table<Staff, string>;
  incidents!: Table<Incident, string>;

  // CRM tables
  clients!: Table<Client, string>;
  contacts!: Table<Contact, string>;
  clientNotes!: Table<ClientNote, string>;
  clientReminders!: Table<ClientReminder, string>;
  clientDocuments!: Table<ClientDocument, string>;
  clientRevenue!: Table<ClientRevenue, string>;

  // Quote & Invoice tables
  quotes!: Table<Quote, string>;
  quoteItems!: Table<QuoteItem, string>;
  invoices!: Table<Invoice, string>;

  constructor() {
    super('EventFlowDB');
    this.version(1).stores({
      missions: 'id, status, startDate',
      equipment: 'id, qrCode, category, status, currentMissionId',
      missionEquipment: '[missionId+equipmentId], missionId, equipmentId',
      vehicles: 'id, status',
      staff: 'id, role',
      incidents: 'id, missionId, status',
    });
    // Version 2 adds the CRM module
    this.version(2).stores({
      missions: 'id, status, startDate',
      equipment: 'id, qrCode, category, status, currentMissionId',
      missionEquipment: '[missionId+equipmentId], missionId, equipmentId',
      vehicles: 'id, status',
      staff: 'id, role',
      incidents: 'id, missionId, status',
      clients: 'id, status, pipelineStage, name',
      contacts: 'id, clientId, isPrimary',
      clientNotes: 'id, clientId, createdAt',
      clientReminders: 'id, clientId, dueDate, done',
      clientDocuments: 'id, clientId, status',
      clientRevenue: 'id, clientId, missionId, date',
    });
    // Version 3 adds the Quotes module
    this.version(3).stores({
      missions: 'id, status, startDate',
      equipment: 'id, qrCode, category, status, currentMissionId',
      missionEquipment: '[missionId+equipmentId], missionId, equipmentId',
      vehicles: 'id, status',
      staff: 'id, role',
      incidents: 'id, missionId, status',
      clients: 'id, status, pipelineStage, name',
      contacts: 'id, clientId, isPrimary',
      clientNotes: 'id, clientId, createdAt',
      clientReminders: 'id, clientId, dueDate, done',
      clientDocuments: 'id, clientId, status',
      clientRevenue: 'id, clientId, missionId, date',
      quotes: 'id, clientId, status',
      quoteItems: 'id, quoteId',
      invoices: 'id, quoteId, status'
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
      { data: incidents },
      { data: clients },
      { data: contacts },
      { data: clientNotes },
      { data: clientReminders },
      { data: clientDocuments },
      { data: clientRevenue },
      { data: quotes },
      { data: quoteItems },
      { data: invoices },
    ] = await Promise.all([
      supabase.from('missions').select('*'),
      supabase.from('equipment').select('*'),
      supabase.from('mission_equipment').select('*'),
      supabase.from('vehicles').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('incidents').select('*'),
      supabase.from('clients').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('contacts').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('client_notes').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('client_reminders').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('client_documents').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('client_revenue').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('quotes').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('quote_items').select('*').then(res => res.error ? { data: null } : res),
      supabase.from('invoices').select('*').then(res => res.error ? { data: null } : res),
    ]);

    await db.transaction('rw', [
      db.missions, db.equipment, db.missionEquipment, db.vehicles, db.staff, db.incidents,
      db.clients, db.contacts, db.clientNotes, db.clientReminders, db.clientDocuments, db.clientRevenue,
      db.quotes, db.quoteItems, db.invoices
    ], async () => {
      
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

      // ── CRM sync ──────────────────────────────────────────────────────────
      if (clients) {
        const mapped = clients.map(c => ({
          id: c.id, name: c.name, email: c.email, phone: c.phone,
          address: c.address, city: c.city, country: c.country,
          website: c.website, industry: c.industry, status: c.status,
          pipelineStage: c.pipeline_stage, notes: c.notes,
          createdAt: c.created_at, updatedAt: c.updated_at,
        }));
        await db.clients.clear();
        await db.clients.bulkPut(mapped);
      }

      if (contacts) {
        const mapped = contacts.map(c => ({
          id: c.id, clientId: c.client_id, firstName: c.first_name,
          lastName: c.last_name, email: c.email, phone: c.phone,
          role: c.role, isPrimary: c.is_primary, createdAt: c.created_at,
        }));
        await db.contacts.clear();
        await db.contacts.bulkPut(mapped);
      }

      if (clientNotes) {
        const mapped = clientNotes.map(n => ({
          id: n.id, clientId: n.client_id, content: n.content,
          authorId: n.author_id, createdAt: n.created_at,
        }));
        await db.clientNotes.clear();
        await db.clientNotes.bulkPut(mapped);
      }

      if (clientReminders) {
        const mapped = clientReminders.map(r => ({
          id: r.id, clientId: r.client_id, title: r.title,
          dueDate: r.due_date, done: r.done, createdAt: r.created_at,
        }));
        await db.clientReminders.clear();
        await db.clientReminders.bulkPut(mapped);
      }

      if (clientDocuments) {
        const mapped = clientDocuments.map(d => ({
          id: d.id, clientId: d.client_id, name: d.name,
          url: d.url, status: d.status, uploadedAt: d.uploaded_at,
        }));
        await db.clientDocuments.clear();
        await db.clientDocuments.bulkPut(mapped);
      }

      if (clientRevenue) {
        const mapped = clientRevenue.map(r => ({
          id: r.id, clientId: r.client_id, missionId: r.mission_id,
          amount: r.amount, description: r.description, date: r.date,
        }));
        await db.clientRevenue.clear();
        await db.clientRevenue.bulkPut(mapped);
      }

      // ── Quotes sync ─────────────────────────────────────────────────────────
      if (quotes) {
        const mapped = quotes.map(q => ({
          id: q.id, clientId: q.client_id, status: q.status,
          totalAmount: q.total_amount, validityDate: q.validity_date,
          signatureData: q.signature_data, createdAt: q.created_at
        }));
        await db.quotes.clear();
        await db.quotes.bulkPut(mapped);
      }
      if (quoteItems) {
        const mapped = quoteItems.map(qi => ({
          id: qi.id, quoteId: qi.quote_id, description: qi.description,
          quantity: qi.quantity, unitPrice: qi.unit_price
        }));
        await db.quoteItems.clear();
        await db.quoteItems.bulkPut(mapped);
      }
      if (invoices) {
        const mapped = invoices.map(i => ({
          id: i.id, quoteId: i.quote_id, missionId: i.mission_id,
          amount: i.amount, status: i.status, createdAt: i.created_at
        }));
        await db.invoices.clear();
        await db.invoices.bulkPut(mapped);
      }
    });

    console.log("Synchronisation de Supabase vers Dexie terminée.");
  } catch (error) {
    console.error("Erreur lors de la synchronisation", error);
  }
}

function setupRealtimeSubscriptions() {
  if (!supabase) return;

  supabase.channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        // Simple strategy: re-fetch everything on change for this demo
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
  
  // Add equipment items to a mission
  addMissionEquipment: async (
    missionId: string,
    equipmentId: string,
    plannedQuantity: number
  ) => {
    if (supabase) {
      const { error } = await supabase.from('mission_equipment').insert({
        mission_id: missionId,
        equipment_id: equipmentId,
        planned_quantity: plannedQuantity,
        loaded_quantity: 0,
        returned_quantity: 0,
      });
      if (error) console.error(error);
    }
    await db.missionEquipment.add({
      missionId,
      equipmentId,
      plannedQuantity,
      loadedQuantity: 0,
      returnedQuantity: 0,
    } as any);
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
  },

  // ── CRM Mutations ──────────────────────────────────────────────────────────

  addClient: async (client: Client) => {
    if (supabase) {
      await supabase.from('clients').insert({
        id: client.id, name: client.name, email: client.email, phone: client.phone,
        address: client.address, city: client.city, country: client.country,
        website: client.website, industry: client.industry, status: client.status,
        pipeline_stage: client.pipelineStage, notes: client.notes,
        created_at: client.createdAt, updated_at: client.updatedAt,
      });
    }
    await db.clients.add(client);
  },

  updateClient: async (client: Client) => {
    const updated = { ...client, updatedAt: new Date().toISOString() };
    if (supabase) {
      await supabase.from('clients').update({
        name: updated.name, email: updated.email, phone: updated.phone,
        address: updated.address, city: updated.city, country: updated.country,
        website: updated.website, industry: updated.industry, status: updated.status,
        pipeline_stage: updated.pipelineStage, notes: updated.notes,
        updated_at: updated.updatedAt,
      }).eq('id', updated.id);
    }
    await db.clients.put(updated);
  },

  deleteClient: async (id: string) => {
    if (supabase) {
      await supabase.from('clients').delete().eq('id', id);
    }
    await db.clients.delete(id);
  },

  addContact: async (contact: Contact) => {
    if (supabase) {
      await supabase.from('contacts').insert({
        id: contact.id, client_id: contact.clientId, first_name: contact.firstName,
        last_name: contact.lastName, email: contact.email, phone: contact.phone,
        role: contact.role, is_primary: contact.isPrimary, created_at: contact.createdAt,
      });
    }
    await db.contacts.add(contact);
  },

  deleteContact: async (id: string) => {
    if (supabase) await supabase.from('contacts').delete().eq('id', id);
    await db.contacts.delete(id);
  },

  addClientNote: async (note: ClientNote) => {
    if (supabase) {
      await supabase.from('client_notes').insert({
        id: note.id, client_id: note.clientId, content: note.content,
        author_id: note.authorId, created_at: note.createdAt,
      });
    }
    await db.clientNotes.add(note);
  },

  deleteClientNote: async (id: string) => {
    if (supabase) await supabase.from('client_notes').delete().eq('id', id);
    await db.clientNotes.delete(id);
  },

  addClientReminder: async (reminder: ClientReminder) => {
    if (supabase) {
      await supabase.from('client_reminders').insert({
        id: reminder.id, client_id: reminder.clientId, title: reminder.title,
        due_date: reminder.dueDate, done: reminder.done, created_at: reminder.createdAt,
      });
    }
    await db.clientReminders.add(reminder);
  },

  toggleClientReminder: async (id: string, done: boolean) => {
    if (supabase) await supabase.from('client_reminders').update({ done }).eq('id', id);
    await db.clientReminders.update(id, { done });
  },

  addClientDocument: async (doc: ClientDocument) => {
    if (supabase) {
      await supabase.from('client_documents').insert({
        id: doc.id, client_id: doc.clientId, name: doc.name,
        url: doc.url, status: doc.status, uploaded_at: doc.uploadedAt,
      });
    }
    await db.clientDocuments.add(doc);
  },

  addClientRevenue: async (rev: ClientRevenue) => {
    if (supabase) {
      await supabase.from('client_revenue').insert({
        id: rev.id, client_id: rev.clientId, mission_id: rev.missionId,
        amount: rev.amount, description: rev.description, date: rev.date,
      });
    }
    await db.clientRevenue.add(rev);
  },

  // ── Quotes & Invoices ────────────────────────────────────────────────────────

  addQuote: async (quote: Quote) => {
    if (supabase) {
      await supabase.from('quotes').insert({
        id: quote.id, client_id: quote.clientId, status: quote.status,
        total_amount: quote.totalAmount, validity_date: quote.validityDate,
        signature_data: quote.signatureData, created_at: quote.createdAt
      });
    }
    await db.quotes.add(quote);
  },
  updateQuote: async (quote: Quote) => {
    if (supabase) {
      await supabase.from('quotes').update({
        status: quote.status, total_amount: quote.totalAmount,
        validity_date: quote.validityDate, signature_data: quote.signatureData
      }).eq('id', quote.id);
    }
    await db.quotes.put(quote);
  },
  addQuoteItem: async (item: QuoteItem) => {
    if (supabase) {
      await supabase.from('quote_items').insert({
        id: item.id, quote_id: item.quoteId, description: item.description,
        quantity: item.quantity, unit_price: item.unitPrice
      });
    }
    await db.quoteItems.add(item);
  },
  addInvoice: async (invoice: Invoice) => {
    if (supabase) {
      await supabase.from('invoices').insert({
        id: invoice.id, quote_id: invoice.quoteId, mission_id: invoice.missionId,
        amount: invoice.amount, status: invoice.status, created_at: invoice.createdAt
      });
    }
    await db.invoices.add(invoice);
  },
};
