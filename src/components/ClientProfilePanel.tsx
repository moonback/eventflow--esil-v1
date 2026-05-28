import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { Client, ClientNote, ClientReminder, ClientDocument, ClientRevenue, Contact } from '../types';
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Building2, Mail, Phone, Globe, MapPin, TrendingUp, FileText,
  AlertTriangle, StickyNote, Bell, Plus, Check, Trash2, User,
  ChevronRight, Euro, Calendar, Package
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

// ─── Pipeline config ──────────────────────────────────────────────────────────
const PIPELINE: Record<string, { label: string; color: string; bg: string }> = {
  lead:        { label: 'Lead',        color: 'text-slate-600',  bg: 'bg-slate-100'  },
  qualified:   { label: 'Qualifié',    color: 'text-blue-700',   bg: 'bg-blue-100'   },
  proposal:    { label: 'Proposition', color: 'text-violet-700', bg: 'bg-violet-100' },
  negotiation: { label: 'Négociation', color: 'text-amber-700',  bg: 'bg-amber-100'  },
  won:         { label: 'Gagné',       color: 'text-emerald-700',bg: 'bg-emerald-100'},
  lost:        { label: 'Perdu',       color: 'text-red-700',    bg: 'bg-red-100'    },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  prospect: { label: 'Prospect', color: 'text-slate-600', bg: 'bg-slate-100' },
  active:   { label: 'Actif',    color: 'text-green-700', bg: 'bg-green-100' },
  vip:      { label: 'VIP',      color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-300' },
  inactive: { label: 'Inactif',  color: 'text-slate-500', bg: 'bg-slate-100' },
  churned:  { label: 'Perdu',    color: 'text-red-600',   bg: 'bg-red-100'   },
};

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, action }: { icon: any; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      {action}
    </div>
  );
}

// ─── Glass card ───────────────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface ClientProfilePanelProps {
  client: Client;
  onEdit?: () => void;
}

export function ClientProfilePanel({ client, onEdit }: ClientProfilePanelProps) {
  const { user } = useAuth();
  const [noteInput, setNoteInput] = useState('');
  const [reminderInput, setReminderInput] = useState('');
  const [reminderDate, setReminderDate] = useState('');

  // Live queries
  const contacts       = useLiveQuery(() => db.contacts.where('clientId').equals(client.id).toArray(), [client.id]) || [];
  const notes          = useLiveQuery(() => db.clientNotes.where('clientId').equals(client.id).reverse().sortBy('createdAt'), [client.id]) || [];
  const reminders      = useLiveQuery(() => db.clientReminders.where('clientId').equals(client.id).toArray(), [client.id]) || [];
  const documents      = useLiveQuery(() => db.clientDocuments.where('clientId').equals(client.id).toArray(), [client.id]) || [];
  const revenueEntries = useLiveQuery(() => db.clientRevenue.where('clientId').equals(client.id).toArray(), [client.id]) || [];
  const allMissions    = useLiveQuery(() => db.missions.toArray()) || [];
  const allEquipment   = useLiveQuery(() => db.equipment.toArray()) || [];
  const allIncidents   = useLiveQuery(() => db.incidents.toArray()) || [];
  const allME          = useLiveQuery(() => db.missionEquipment.toArray()) || [];
  const quotes         = useLiveQuery(() => db.quotes.where('clientId').equals(client.id).reverse().toArray(), [client.id]) || [];

  // Derived data
  const clientMissions = allMissions.filter(m => m.client === client.name);
  const missionIds = new Set(clientMissions.map(m => m.id));
  const clientIncidents = allIncidents.filter(i => missionIds.has(i.missionId));
  const totalRevenue = revenueEntries.reduce((sum, r) => sum + r.amount, 0);

  // Most-used equipment
  const equipUsage: Record<string, number> = {};
  allME.filter(me => missionIds.has(me.missionId)).forEach(me => {
    equipUsage[me.equipmentId] = (equipUsage[me.equipmentId] || 0) + me.plannedQuantity;
  });
  const topEquipment = Object.entries(equipUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ eq: allEquipment.find(e => e.id === id), count }))
    .filter(x => x.eq);

  const pipeline = PIPELINE[client.pipelineStage] || PIPELINE.lead;
  const statusConf = STATUS_CONFIG[client.status] || STATUS_CONFIG.prospect;

  // Handlers
  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    await dbMutations.addClientNote({
      id: `cn-${Date.now()}`,
      clientId: client.id,
      content: noteInput.trim(),
      authorId: user?.id || 'unknown',
      createdAt: new Date().toISOString(),
    });
    setNoteInput('');
  };

  const handleAddReminder = async () => {
    if (!reminderInput.trim() || !reminderDate) return;
    await dbMutations.addClientReminder({
      id: `cr-${Date.now()}`,
      clientId: client.id,
      title: reminderInput.trim(),
      dueDate: reminderDate,
      done: false,
      createdAt: new Date().toISOString(),
    });
    setReminderInput('');
    setReminderDate('');
  };

  return (
    <div
      className="min-h-full"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)' }}
    >
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden rounded-2xl mb-6 shadow-lg"
           style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)' }}>
        <div className="absolute inset-0 opacity-10"
             style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative p-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
              <span className="text-2xl font-bold text-white">{client.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-xl font-bold text-white">{client.name}</h1>
                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", statusConf.bg, statusConf.color)}>
                  {statusConf.label}
                </span>
                {client.status === 'vip' && <span className="text-amber-300 text-sm">★</span>}
              </div>
              {client.industry && <p className="text-indigo-200 text-sm">{client.industry}</p>}
              <div className="mt-1 flex items-center gap-1.5">
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", pipeline.bg, pipeline.color)}>
                  {pipeline.label}
                </span>
                <ChevronRight className="w-3 h-3 text-white/40" />
                <span className="text-white/60 text-xs">{clientMissions.length} mission(s)</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {onEdit && (
              <button onClick={onEdit}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl backdrop-blur-sm border border-white/30 transition-all">
                Modifier
              </button>
            )}
            <button onClick={() => window.location.href = '/quotes/new'}
              className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-xl shadow-md transition-all hover:scale-105">
              Nouveau Devis
            </button>
          </div>
        </div>

        {/* Revenue strip */}
        <div className="relative border-t border-white/20 bg-black/10 px-6 py-3 flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">CA Total</p>
            <p className="text-lg font-bold text-white">{totalRevenue.toLocaleString('fr-FR')} €</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Missions</p>
            <p className="text-lg font-bold text-white">{clientMissions.length}</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Incidents</p>
            <p className={cn("text-lg font-bold", clientIncidents.length > 0 ? 'text-amber-300' : 'text-white')}>{clientIncidents.length}</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">Contacts</p>
            <p className="text-lg font-bold text-white">{contacts.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ─── Left column ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Company info */}
          <Card>
            <SectionHeader icon={Building2} title="Informations" />
            <div className="space-y-2.5 text-sm">
              {client.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <a href={`mailto:${client.email}`} className="hover:text-indigo-600 transition-colors truncate">{client.email}</a>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                  <a href={`tel:${client.phone}`} className="hover:text-indigo-600 transition-colors">{client.phone}</a>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{[client.address, client.city, client.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="w-4 h-4 text-indigo-400 shrink-0" />
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 transition-colors truncate">{client.website}</a>
                </div>
              )}
              {client.notes && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-slate-500 text-xs italic leading-relaxed">
                  {client.notes}
                </div>
              )}
            </div>
          </Card>

          {/* Contacts */}
          <Card>
            <SectionHeader icon={User} title={`Contacts (${contacts.length})`} />
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">Aucun contact</p>
            ) : (
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">
                        {c.firstName} {c.lastName}
                        {c.isPrimary && <span className="ml-1.5 text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">PRINCIPAL</span>}
                      </p>
                      {c.role && <p className="text-[11px] text-slate-500">{c.role}</p>}
                      {c.email && <p className="text-[11px] text-indigo-500 truncate">{c.email}</p>}
                    </div>
                    <button onClick={() => dbMutations.deleteContact(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Frequently used equipment */}
          <Card>
            <SectionHeader icon={Package} title="Matériel fréquent" />
            {topEquipment.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">Aucune donnée</p>
            ) : (
              <div className="space-y-2">
                {topEquipment.map(({ eq, count }) => (
                  <div key={eq!.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span className="text-sm text-slate-700 truncate">{eq!.name}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{eq!.category}</span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">×{count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ─── Middle column ────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Mission history */}
          <Card>
            <SectionHeader icon={Calendar} title={`Historique missions (${clientMissions.length})`} />
            {clientMissions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">Aucune mission</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {clientMissions.slice().reverse().map(m => (
                  <div key={m.id} className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm text-slate-800 leading-tight">{m.title}</p>
                      <span className={cn(
                        "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                        m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        m.status === 'live' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-600'
                      )}>{m.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>
                      <span>{format(new Date(m.startDate), 'dd MMM yy', { locale: fr })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Incidents */}
          <Card>
            <SectionHeader icon={AlertTriangle} title={`Incidents (${clientIncidents.length})`} />
            {clientIncidents.length === 0 ? (
              <div className="flex flex-col items-center py-4 gap-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-400">Aucun incident</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {clientIncidents.map(i => (
                  <div key={i.id} className={cn(
                    "p-3 rounded-xl border text-sm",
                    i.status === 'open' ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'
                  )}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="font-medium text-slate-800 line-clamp-1">{i.description}</p>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                        i.status === 'open' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600')}>
                        {i.status === 'open' ? 'Ouvert' : 'Résolu'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{format(new Date(i.createdAt), 'dd MMM yyyy', { locale: fr })}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Documents */}
          <Card>
            <SectionHeader icon={FileText} title={`Documents (${documents.length})`} />
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">Aucun document</p>
            ) : (
              <div className="space-y-2">
                {documents.map(d => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-700">{d.name}</p>
                      <p className="text-[11px] text-slate-400">{format(new Date(d.uploadedAt), 'dd MMM yyyy', { locale: fr })}</p>
                    </div>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                      d.status === 'signed'   ? 'bg-emerald-100 text-emerald-700' :
                      d.status === 'sent'     ? 'bg-blue-100 text-blue-700' :
                      d.status === 'archived' ? 'bg-slate-100 text-slate-500' :
                                                'bg-amber-100 text-amber-700'
                    )}>{d.status}</span>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ─── Right column ─────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Quotes */}
          <Card>
            <SectionHeader icon={FileText} title={`Devis (${quotes.length})`} />
            {quotes.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-3">Aucun devis</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {quotes.map(q => (
                  <a key={q.id} href={`/quotes/${q.id}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all group">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">Devis {q.id.split('-')[1]}</p>
                      <p className="text-[11px] text-slate-500">{format(new Date(q.createdAt), 'dd MMM yyyy', { locale: fr })}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-indigo-600">{q.totalAmount.toFixed(2)} €</p>
                      <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded uppercase mt-1 inline-block",
                        q.status === 'signed' || q.status === 'invoiced' ? 'bg-emerald-100 text-emerald-700' :
                        q.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      )}>{q.status}</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Revenue */}
          <Card>
            <SectionHeader icon={Euro} title="Facturation" />
            <div className="mb-4 p-4 rounded-2xl text-center"
                 style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              <p className="text-xs text-indigo-200 uppercase tracking-wider font-semibold mb-1">Chiffre d'affaires total</p>
              <p className="text-3xl font-bold text-white">{totalRevenue.toLocaleString('fr-FR')} €</p>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {revenueEntries.slice().reverse().map(r => (
                <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 transition-colors text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-slate-600 text-xs truncate">{r.description || format(new Date(r.date), 'dd MMM yyyy', { locale: fr })}</span>
                  </div>
                  <span className="font-semibold text-emerald-700 shrink-0">+{r.amount.toLocaleString('fr-FR')} €</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Notes */}
          <Card>
            <SectionHeader icon={StickyNote} title={`Notes (${notes.length})`} />
            <div className="space-y-2 max-h-44 overflow-y-auto mb-3 pr-0.5">
              {notes.length === 0
                ? <p className="text-sm text-slate-400 text-center py-2">Aucune note</p>
                : notes.map(n => (
                  <div key={n.id} className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-slate-700 leading-relaxed group relative">
                    <p>{n.content}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{format(new Date(n.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}</p>
                    <button onClick={() => dbMutations.deleteClientNote(n.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              }
            </div>
            <div className="flex gap-2">
              <input value={noteInput} onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Ajouter une note…"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80" />
              <button onClick={handleAddNote}
                className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </Card>

          {/* Reminders */}
          <Card>
            <SectionHeader icon={Bell} title={`Rappels (${reminders.filter(r => !r.done).length} actifs)`} />
            <div className="space-y-2 max-h-36 overflow-y-auto mb-3">
              {reminders.length === 0
                ? <p className="text-sm text-slate-400 text-center py-2">Aucun rappel</p>
                : reminders.map(r => (
                  <div key={r.id} className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl border transition-all",
                    r.done ? 'bg-slate-50 border-slate-100 opacity-50' : 'bg-violet-50 border-violet-100'
                  )}>
                    <button onClick={() => dbMutations.toggleClientReminder(r.id, !r.done)}
                      className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                        r.done ? 'bg-emerald-500 border-emerald-500' : 'border-violet-400 hover:border-emerald-400')}>
                      {r.done && <Check className="w-2.5 h-2.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", r.done ? 'line-through text-slate-400' : 'text-slate-800')}>{r.title}</p>
                      <p className="text-[10px] text-slate-400">{format(new Date(r.dueDate), 'dd MMM yyyy', { locale: fr })}</p>
                    </div>
                  </div>
                ))
              }
            </div>
            <div className="space-y-2">
              <input value={reminderInput} onChange={e => setReminderInput(e.target.value)}
                placeholder="Titre du rappel…"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white/80" />
              <div className="flex gap-2">
                <input type="date" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white/80" />
                <button onClick={handleAddReminder}
                  className="w-9 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex items-center justify-center transition-colors shadow-sm">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
