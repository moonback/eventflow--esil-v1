import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { Activity, Clock, Truck, Plus, PackageSearch, AlertTriangle, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '../lib/utils';

export function Dashboard() {
  const [isCreatingMode, setIsCreatingMode] = useState(false);
  const [newPrestationTitle, setNewPrestationTitle] = useState('');

  const missions = useLiveQuery(() => db.missions.toArray()) || [];
  const incidents = useLiveQuery(() => db.incidents.where('status').equals('open').toArray()) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray()) || [];

  const handleCreatePrestation = async () => {
    if (!newPrestationTitle.trim()) return;
    
    await dbMutations.addMission({
      id: `m-new-${Date.now()}`,
      title: newPrestationTitle,
      client: 'Client Inconnu',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      location: 'Site de Prestation',
      status: 'planned',
      staffIds: ['s-1'], 
      vehicleId: null
    });
    
    setNewPrestationTitle('');
    setIsCreatingMode(false);
  };

  const activeMissions = missions.filter(m => m.status !== 'completed' && m.status !== 'planned');
  const enRouteMissions = missions.filter(m => m.status === 'en_route');
  
  const statusColors: Record<string, string> = {
    planned: 'bg-slate-100 text-slate-600',
    loading: 'bg-amber-100 text-amber-700',
    en_route: 'bg-blue-100 text-blue-700',
    installing: 'bg-green-100 text-green-700',
    live: 'bg-red-100 text-red-700 font-medium',
    dismantling: 'bg-pink-100 text-pink-700',
    returning: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-emerald-100 text-emerald-700',
  };

  const statusLabels: Record<string, string> = {
    planned: 'Planifié',
    loading: 'Chargement',
    en_route: 'En route',
    installing: 'Montage',
    live: 'En cours (Live)',
    dismantling: 'Démontage',
    returning: 'Retour',
    completed: 'Terminé',
  };

  return (
    <div className="p-4 md:p-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pb-24 md:pb-8">
      {/* Active Missions List (2/3 width) */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Mobile-only page header (Desktop has one in layout) */}
        <div className="md:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Tour de contrôle
            </h1>
            <p className="text-sm text-slate-500">Vue d'ensemble des opérations du {format(new Date(), 'EEEE d MMMM', { locale: fr })}.</p>
          </div>
          <button 
            onClick={() => setIsCreatingMode(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Prestation
          </button>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={Activity} label="Opérations Actives" value={activeMissions.length} />
        <StatsCard icon={Truck} label="Camions en route" value={enRouteMissions.length} />
        <StatsCard icon={AlertTriangle} label="Incidents ouverts" value={incidents.length} alert={incidents.length > 0} alertColor="red" />
        <StatsCard 
          icon={PackageSearch} 
          label="Matériel en prestation" 
          value={equipment.filter(e => e.status === 'on_mission').length} 
          subValue={`/${equipment.length} total`} 
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-800">Flux Logistique Actif</h3>
          <div className="text-xs text-slate-400 uppercase">Dernière synchro: {format(new Date(), 'HH:mm')}</div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Mission / Client</th>
                <th className="px-4 py-3">État / Statut</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-50">
              {missions.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-slate-500">Aucune prestation trouvée.</td></tr>
              ) : (
                missions.map(mission => (
                  <tr key={mission.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-mono text-xs font-medium text-slate-500">#{mission.id.toUpperCase()}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">{mission.title}</div>
                      <div className="text-xs text-slate-400 font-serif italic mt-0.5">{mission.client} - {format(new Date(mission.startDate), 'dd MMM', { locale: fr })}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusColors[mission.status]}`}>
                        {statusLabels[mission.status]}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Field Technician Preview Panel / Info */}
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="bg-[#1E293B] rounded-2xl p-6 h-full text-white shadow-2xl relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
          
          <div className="flex justify-between items-center mb-8">
            <div className="text-xs font-bold text-slate-400 tracking-tighter uppercase">Incidents & Alertes</div>
            <div className="flex gap-1">
              <div className="w-3 h-1 bg-amber-400 rounded-full"></div>
              <div className="w-3 h-1 bg-red-400 rounded-full"></div>
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-auto">
              {incidents.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400 bg-white/5 border border-white/5 rounded-xl">Aucun log incident ouvert.</div>
              ) : (
                incidents.map(incident => (
                  <div key={incident.id} className="p-4 flex gap-3 text-sm bg-white/5 border border-white/10 rounded-xl group relative">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    <div className="flex-1">
                      <p className="text-slate-100 font-medium">{incident.description}</p>
                      <p className="text-xs text-slate-400 mt-1 italic">Il y a {Math.floor((Date.now() - new Date(incident.createdAt).getTime()) / 60000)} min • Mission {incident.missionId}</p>
                    </div>
                    <button 
                      onClick={() => dbMutations.updateIncidentStatus(incident.id, 'resolved')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs font-medium self-start mt-1"
                    >
                      Résoudre
                    </button>
                  </div>
                ))
              )}
          </div>
          
          <div className="mt-8 flex justify-between items-center text-[10px] text-slate-500 relative z-10">
            <span>SUPABASE REALTIME</span>
            <span className="text-green-500 font-bold italic">SYNCED</span>
          </div>
      </div>
    </div>
    
    {isCreatingMode && (
      <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              Nouvelle Prestation
            </h3>
            <button onClick={() => setIsCreatingMode(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Titre de la presta</label>
              <input 
                type="text" 
                value={newPrestationTitle}
                onChange={(e) => setNewPrestationTitle(e.target.value)}
                placeholder="ex: Concert Zénith..."
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsCreatingMode(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleCreatePrestation}
                disabled={!newPrestationTitle.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

  </div>
  );
}

function StatsCard({ icon: Icon, label, value, subValue, alert, alertColor = 'red' }: any) {
  return (
    <div className={cn("bg-white p-4 border rounded-lg flex flex-col justify-between shadow-sm", alert ? `border-${alertColor}-200 bg-${alertColor}-50/50` : "border-slate-200")}>
      <div className="flex justify-between items-start mb-2">
        <div className={cn("text-xs font-bold uppercase tracking-wider", alert ? `text-${alertColor}-400` : "text-slate-400")}>
          {label}
        </div>
      </div>
      <div>
        <div className={cn("text-2xl font-bold flex items-baseline gap-1 mt-1", alert ? `text-${alertColor}-600` : "text-slate-900")}>
          {value}
          {subValue && <span className="text-sm font-normal text-slate-400">{subValue}</span>}
        </div>
      </div>
    </div>
  )
}

