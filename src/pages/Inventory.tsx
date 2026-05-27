import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { Search, Filter, Plus, Package, Info, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { EquipmentCategory, EquipmentStatus } from '../types';

export function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'all'>('all');
  const [isCreatingMode, setIsCreatingMode] = useState(false);
  const [newEqName, setNewEqName] = useState('');
  const [newEqCategory, setNewEqCategory] = useState<EquipmentCategory>('audio');
  const [newEqBrand, setNewEqBrand] = useState('');
  
  const equipment = useLiveQuery(() => {
    let q = db.equipment.toCollection();
    return q.toArray();
  }) || [];

  const handleCreateEquipment = async () => {
    if (!newEqName.trim()) return;

    const prefix = newEqCategory.substring(0, 3).toUpperCase();
    const count = equipment.filter(e => e.category === newEqCategory).length + 1;
    const qrCode = `QR-${prefix}-${count.toString().padStart(3, '0')}`;

    await dbMutations.addEquipment({
      id: `e-${Date.now()}`,
      qrCode,
      name: newEqName,
      brand: newEqBrand || 'Générique',
      category: newEqCategory,
      status: 'warehouse'
    });

    setNewEqName('');
    setNewEqBrand('');
    setNewEqCategory('audio');
    setIsCreatingMode(false);
  };

  const filteredEq = equipment.filter(e => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (searchTerm && !e.name.toLowerCase().includes(searchTerm.toLowerCase()) && !e.qrCode.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const statusColors: Record<EquipmentStatus, string> = {
    warehouse: 'bg-green-100 text-green-700',
    on_mission: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    lost: 'bg-red-100 text-red-700'
  };
  
  const statusLabels: Record<EquipmentStatus, string> = {
    warehouse: 'En Magasin',
    on_mission: 'En Presta',
    maintenance: 'En Maintenance',
    lost: 'Perdu / Volé'
  };

  return (
    <div className="p-4 md:p-8 md:pb-8 pb-24 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
            Parc Matériel
          </h1>
          <p className="text-sm text-slate-500">Gestion des stocks et suivi des équipements.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Ajouter du matériel
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou QR (ex: L-Acoustics, QR-LAK2-001)..." 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
           <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
           <select 
             className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px]"
             value={categoryFilter}
             onChange={(e) => setCategoryFilter(e.target.value as any)}
           >
             <option value="all">Toutes catégories</option>
             <option value="audio">Audio</option>
             <option value="lighting">Lumière</option>
             <option value="video">Vidéo</option>
             <option value="structure">Structure</option>
             <option value="power">Énergie</option>
           </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 text-[11px] uppercase text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Code / QR</th>
                <th className="px-5 py-3">Désignation</th>
                <th className="px-5 py-3">Marque</th>
                <th className="px-5 py-3">Statut</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEq.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                       <Package className="w-8 h-8 text-slate-300" />
                       <p>Aucun équipement trouvé.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEq.map(eq => (
                  <tr key={eq.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-5 py-3">
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono border border-slate-200">{eq.qrCode}</code>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">{eq.name}</td>
                    <td className="px-5 py-3 text-slate-500">{eq.brand}</td>
                    <td className="px-5 py-3">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider", statusColors[eq.status])}>
                        {statusLabels[eq.status]}
                      </span>
                      {eq.status === 'on_mission' && <span className="ml-2 text-[11px] text-slate-400 font-mono inline-block mt-1">Mission: {eq.currentMissionId}</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-auto px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 font-medium flex justify-between items-center">
          <span>Affichage de {filteredEq.length} référence(s)</span>
        </div>
      </div>

      {isCreatingMode && (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                Ajouter du Matériel
              </h3>
              <button onClick={() => setIsCreatingMode(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Désignation</label>
                <input 
                  type="text" 
                  value={newEqName}
                  onChange={(e) => setNewEqName(e.target.value)}
                  placeholder="ex: Enceinte L-Acoustics K2..."
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Marque</label>
                  <input 
                    type="text" 
                    value={newEqBrand}
                    onChange={(e) => setNewEqBrand(e.target.value)}
                    placeholder="ex: L-Acoustics"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Catégorie</label>
                  <select
                    value={newEqCategory}
                    onChange={(e) => setNewEqCategory(e.target.value as EquipmentCategory)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="audio">Audio</option>
                    <option value="light">Lumière</option>
                    <option value="video">Vidéo</option>
                    <option value="structure">Structure</option>
                    <option value="energy">Énergie</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsCreatingMode(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium text-sm rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleCreateEquipment}
                  disabled={!newEqName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
