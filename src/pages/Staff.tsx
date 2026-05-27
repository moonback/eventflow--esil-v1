import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Users, Search, Phone, Mail, Shield } from 'lucide-react';
import { db } from '../db/db';

export function Staff() {
  const staffMembers = useLiveQuery(() => db.staff.toArray()) || [];
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = staffMembers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'dispatcher': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Dispatcher</span>;
      case 'technician': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Technicien</span>;
      case 'driver': return <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Chauffeur</span>;
      case 'manager': return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">Manager</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">{role}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50">
      <div className="p-8 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600" />
              Personnel
            </h1>
            <p className="text-slate-500 mt-1">Annuaire et gestion de l'équipe</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher par nom ou rôle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map(s => {
            const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';
            return (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-800 truncate">{s.name}</h3>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      {getRoleBadge(s.role)}
                    </div>
                  </div>
                </div>
                
                {(s.phone) && (
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-sm">
                    {s.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.phone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredStaff.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
              <Users className="w-12 h-12 text-slate-300 mb-4" />
              <p className="font-medium text-slate-600">Aucun membre du personnel trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
