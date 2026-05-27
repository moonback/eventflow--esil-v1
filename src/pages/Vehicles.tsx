import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Truck, Plus, Search, Edit2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { db, dbMutations } from '../db/db';
import { Vehicle } from '../types';

export function Vehicles() {
  const vehicles = useLiveQuery(() => db.vehicles.toArray()) || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddMode, setIsAddMode] = useState(false);
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    capacityVolume: '',
    capacityWeight: '',
    status: 'available' as Vehicle['status'],
  });

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddVehicle = async () => {
    if (!formData.plate || !formData.model) return;
    
    // Check if dbMutations.addVehicle exists, we will create it next.
    // For now we assume we'll add it in db.ts
    await dbMutations.addVehicle({
      id: `v_${Date.now()}`,
      plate: formData.plate,
      model: formData.model,
      capacityVolume: parseFloat(formData.capacityVolume) || 0,
      capacityWeight: parseFloat(formData.capacityWeight) || 0,
      status: formData.status
    });
    
    setIsAddMode(false);
    setFormData({ plate: '', model: '', capacityVolume: '', capacityWeight: '', status: 'available' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-100 text-emerald-700';
      case 'on_mission': return 'bg-blue-100 text-blue-700';
      case 'maintenance': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'on_mission': return <Truck className="w-3.5 h-3.5" />;
      case 'maintenance': return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'on_mission': return 'En mission';
      case 'maintenance': return 'En maintenance';
      default: return status;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <div className="p-8 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-7 h-7 text-blue-600" />
              Flotte de Véhicules
            </h1>
            <p className="text-slate-500 mt-1">Gérez vos camions et utilitaires</p>
          </div>
          
          <button 
            onClick={() => setIsAddMode(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Ajouter un véhicule
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par plaque ou modèle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVehicles.map(v => (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{v.plate}</h3>
                      <p className="text-xs font-medium text-slate-500">{v.model}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Volume</p>
                    <p className="font-semibold text-slate-700">{v.capacityVolume} m³</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Charge utile</p>
                    <p className="font-semibold text-slate-700">{v.capacityWeight} kg</p>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide border ${getStatusColor(v.status).replace('bg-', 'border-').replace('100', '200')} ${getStatusColor(v.status)}`}>
                  {getStatusIcon(v.status)}
                  {getStatusText(v.status)}
                </span>
                
                {/* On pourrait ajouter un bouton éditer ici plus tard */}
                <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {filteredVehicles.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
              <Truck className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-medium text-slate-600">Aucun véhicule trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Ajout Véhicule */}
      {isAddMode && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Ajouter un véhicule
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plaque d'immatriculation *</label>
                <input 
                  type="text" 
                  value={formData.plate}
                  onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                  placeholder="EX: AB-123-CD"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modèle *</label>
                <input 
                  type="text" 
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                  placeholder="EX: Renault Master"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Volume (m³)</label>
                  <input 
                    type="number" 
                    value={formData.capacityVolume}
                    onChange={e => setFormData({...formData, capacityVolume: e.target.value})}
                    placeholder="20"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Charge utile (kg)</label>
                  <input 
                    type="number" 
                    value={formData.capacityWeight}
                    onChange={e => setFormData({...formData, capacityWeight: e.target.value})}
                    placeholder="1200"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Statut initial</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Disponible</option>
                  <option value="on_mission">En mission</option>
                  <option value="maintenance">En maintenance</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button 
                onClick={() => setIsAddMode(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleAddVehicle}
                disabled={!formData.plate || !formData.model}
                className="flex-1 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
