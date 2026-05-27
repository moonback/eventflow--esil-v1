import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, MapPin, Truck, Users, X, Pencil, Trash2 } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { cn } from '../lib/utils';
import { MissionStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function Planning() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'manager' || profile?.role === 'dispatcher';

  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [isPlanningMode, setIsPlanningMode] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    location: '',
    startDate: '',
    endDate: '',
    staffIds: [] as string[],
    vehicleId: '',
    notes: ''
  });

  const missions = useLiveQuery(() => db.missions.toArray()) || [];
  const vehicles = useLiveQuery(() => db.vehicles.toArray()) || [];
  const staff = useLiveQuery(() => db.staff.toArray()) || [];

  const handleOpenPlan = () => {
    setEditingMissionId(null);
    setFormData({
      title: '',
      client: '',
      location: '',
      startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      staffIds: [],
      vehicleId: '',
      notes: ''
    });
    setIsPlanningMode(true);
  };

  const handleEditMission = (e: MouseEvent, mission: any) => {
    e.stopPropagation();
    setEditingMissionId(mission.id);
    setFormData({
      title: mission.title,
      client: mission.client,
      location: mission.location,
      startDate: format(new Date(mission.startDate), "yyyy-MM-dd'T'HH:mm"),
      endDate: format(new Date(mission.endDate), "yyyy-MM-dd'T'HH:mm"),
      staffIds: mission.staffIds,
      vehicleId: mission.vehicleId || '',
      notes: mission.notes || ''
    });
    setIsPlanningMode(true);
  };

  const handleDeleteMission = async (e: MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Voulez-vous vraiment supprimer cette mission ?')) {
      await dbMutations.deleteMission(id);
    }
  };

  const handlePlanMission = async () => {
    if (!formData.title.trim() || !formData.startDate || !formData.endDate) return;
    
    const missionData = {
      id: editingMissionId || `m-new-${Date.now()}`,
      title: formData.title,
      client: formData.client || 'Client Inconnu',
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      location: formData.location || 'Lieu Inconnu',
      status: 'planned' as any,
      staffIds: formData.staffIds,
      vehicleId: formData.vehicleId || null,
      notes: formData.notes
    };

    if (editingMissionId) {
      await dbMutations.updateMission(missionData);
    } else {
      await dbMutations.addMission(missionData);
    }
    
    setIsPlanningMode(false);
    setEditingMissionId(null);
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  const statusColors: Record<MissionStatus, string> = {
    planned: 'bg-slate-100 text-slate-700 border-slate-300',
    loading: 'bg-amber-100 text-amber-800 border-amber-300',
    en_route: 'bg-blue-100 text-blue-800 border-blue-300',
    installing: 'bg-green-100 text-green-800 border-green-300',
    live: 'bg-red-100 text-red-800 border-red-300',
    dismantling: 'bg-pink-100 text-pink-800 border-pink-300',
    returning: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  };

  const nextWeek = () => setCurrentWeek(addDays(currentWeek, 7));
  const prevWeek = () => setCurrentWeek(addDays(currentWeek, -7));
  const today = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="p-4 md:p-8 flex-1 flex flex-col overflow-hidden pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Planning & Missions
          </h1>
          <p className="text-sm text-slate-500">Vue calendaire des déploiements prévus.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
            <button onClick={prevWeek} className="p-2 hover:bg-slate-50 rounded-l-lg border-r border-slate-200"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
            <button onClick={today} className="px-4 py-2 text-sm font-medium hover:bg-slate-50 text-slate-700">Aujourd'hui</button>
            <button onClick={nextWeek} className="p-2 hover:bg-slate-50 rounded-r-lg border-l border-slate-200"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
          </div>
          {isAdmin && (
            <button 
              onClick={handleOpenPlan}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Planifier
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
          {days.map(day => (
            <div key={day.toISOString()} className={cn("px-4 py-3 text-center border-r border-slate-200 last:border-0", isSameDay(day, new Date()) && "bg-blue-50")}>
              <div className={cn("text-xs font-bold uppercase tracking-wider mb-1", isSameDay(day, new Date()) ? "text-blue-600" : "text-slate-500")}>
                {format(day, 'EEEE', { locale: fr })}
              </div>
              <div className={cn("text-lg font-semibold", isSameDay(day, new Date()) ? "text-blue-700" : "text-slate-900")}>
                {format(day, 'd', { locale: fr })}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 overflow-y-auto">
          {days.map(day => {
            const dayMissions = missions.filter(m => {
              const start = new Date(m.startDate);
              const end = new Date(m.endDate);
              // Ensure we capture overlapping days
              return (day >= start && day <= end) || isSameDay(day, start) || isSameDay(day, end);
            });

            return (
              <div key={`content-${day.toISOString()}`} className={cn("border-r border-slate-100 last:border-0 p-2 min-h-[400px]", isSameDay(day, new Date()) && "bg-blue-50/10")}>
                {dayMissions.length === 0 ? (
                  <div className="text-center p-4 text-[10px] text-slate-400 font-medium">Libre</div>
                ) : (
                  <div className="space-y-2">
                    {dayMissions.map(mission => {
                      const v = vehicles.find(vh => vh.id === mission.vehicleId);
                      const s = staff.filter(st => mission.staffIds.includes(st.id));
                      
                      return (
                        <div key={mission.id} className={cn("p-2 rounded-md border shadow-sm text-left flex flex-col gap-1.5 cursor-pointer hover:shadow-md transition-shadow group relative", statusColors[mission.status])}>
                          <div className="flex justify-between items-start">
                            <div className="text-[10px] font-bold uppercase tracking-widest bg-white/50 inline-block px-1 rounded truncate">#{mission.id.toUpperCase()}</div>
                            {isAdmin && (
                              <div className="hidden group-hover:flex items-center gap-1 absolute top-1 right-1 bg-white/90 rounded p-0.5 shadow-sm">
                                <button onClick={(e) => handleEditMission(e, mission)} className="p-1 hover:text-blue-600 text-slate-500 rounded hover:bg-slate-100 transition-colors">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button onClick={(e) => handleDeleteMission(e, mission.id)} className="p-1 hover:text-red-600 text-slate-500 rounded hover:bg-slate-100 transition-colors">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="font-semibold text-sm leading-tight line-clamp-2 pr-4">{mission.title}</div>
                          
                          <div className="flex flex-col gap-1 mt-1 text-xs opacity-90">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{mission.location}</span>
                            </div>
                            {v && (
                              <div className="flex items-center gap-1">
                                <Truck className="w-3 h-3 shrink-0" />
                                <span className="truncate">{v.model} ({v.plate})</span>
                              </div>
                            )}
                            {s.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3 shrink-0" />
                                <span className="truncate">{s.length} membre(s)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {isPlanningMode && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {editingMissionId ? 'Modifier la Mission' : 'Planifier une Mission'}
              </h3>
              <button onClick={() => setIsPlanningMode(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Titre de la mission *</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="ex: Festival d'été..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client</label>
                  <input 
                    type="text" 
                    value={formData.client}
                    onChange={(e) => setFormData({...formData, client: e.target.value})}
                    placeholder="Nom du client"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lieu</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Adresse ou lieu"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date et heure de début *</label>
                  <input 
                    type="datetime-local" 
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date et heure de fin *</label>
                  <input 
                    type="datetime-local" 
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assignation de l'équipe</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 border border-slate-200 rounded-lg max-h-32 overflow-y-auto bg-slate-50/50">
                  {staff.map(s => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.staffIds.includes(s.id)}
                        onChange={(e) => {
                          const newStaffIds = e.target.checked 
                            ? [...formData.staffIds, s.id] 
                            : formData.staffIds.filter(id => id !== s.id);
                          setFormData({...formData, staffIds: newStaffIds});
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Véhicule assigné</label>
                <select 
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Aucun véhicule</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.model} - {v.plate}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Informations complémentaires..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[80px]"
                />
              </div>

            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50">
              <button 
                onClick={() => setIsPlanningMode(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handlePlanMission}
                disabled={!formData.title.trim() || !formData.startDate || !formData.endDate}
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {editingMissionId ? 'Enregistrer' : 'Planifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
