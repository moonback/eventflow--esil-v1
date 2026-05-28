import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { Client, ClientStatus, PipelineStageKey } from '../types';
import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Search, Building2, ChevronRight, Phone, Mail, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS: Record<ClientStatus, { bg: string; text: string; label: string }> = {
  prospect: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Prospect' },
  active:   { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Actif' },
  vip:      { bg: 'bg-amber-100', text: 'text-amber-700', label: 'VIP' },
  inactive: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Inactif' },
  churned:  { bg: 'bg-red-100', text: 'text-red-700', label: 'Perdu' },
};

const PIPELINE_COLORS: Record<PipelineStageKey, { bg: string; text: string; label: string }> = {
  lead:        { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Lead' },
  qualified:   { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Qualifié' },
  proposal:    { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Proposition' },
  negotiation: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Négociation' },
  won:         { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Gagné' },
  lost:        { bg: 'bg-red-100', text: 'text-red-700', label: 'Perdu' },
};

export function Clients() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'manager' || profile?.role === 'dispatcher';
  const clients = useLiveQuery(() => db.clients.toArray()) || [];
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    status: 'prospect',
    pipelineStage: 'lead'
  });

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newClient.name) return;
    
    const client: Client = {
      id: `c-${Date.now()}`,
      name: newClient.name,
      email: newClient.email || '',
      phone: newClient.phone,
      address: newClient.address,
      industry: newClient.industry,
      status: newClient.status as ClientStatus || 'prospect',
      pipelineStage: newClient.pipelineStage as PipelineStageKey || 'lead',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbMutations.addClient(client);
    setIsAdding(false);
    setNewClient({ name: '', email: '', phone: '', status: 'prospect', pipelineStage: 'lead' });
  };

  return (
    <div className="p-4 md:p-8 flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Clients & CRM
          </h1>
          <p className="text-sm text-slate-500">Gérez vos clients, prospects et pipeline commercial.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nouveau
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
          {filteredClients.map(client => {
            const status = STATUS_COLORS[client.status] || STATUS_COLORS.prospect;
            const pipeline = PIPELINE_COLORS[client.pipelineStage] || PIPELINE_COLORS.lead;
            
            return (
              <Link key={client.id} to={`/clients/${client.id}`} 
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 line-clamp-1">{client.name}</h3>
                      {client.industry && <p className="text-xs text-slate-500">{client.industry}</p>}
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 mb-4 flex-1">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                  <div className="flex gap-2">
                    <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase", status.bg, status.text)}>
                      {status.label}
                    </span>
                    <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase", pipeline.bg, pipeline.text)}>
                      {pipeline.label}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Nouveau Client</h3>
              <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom / Société *</label>
                <input type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <input type="email" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone</label>
                <input type="tel" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Statut</label>
                  <select value={newClient.status} onChange={e => setNewClient({...newClient, status: e.target.value as ClientStatus})}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500">
                    <option value="prospect">Prospect</option>
                    <option value="active">Actif</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pipeline</label>
                  <select value={newClient.pipelineStage} onChange={e => setNewClient({...newClient, pipelineStage: e.target.value as PipelineStageKey})}
                    className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500">
                    <option value="lead">Lead</option>
                    <option value="qualified">Qualifié</option>
                    <option value="proposal">Proposition</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end gap-2 border-t border-slate-100">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-medium">Annuler</button>
              <button onClick={handleAdd} disabled={!newClient.name} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50">Créer client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
