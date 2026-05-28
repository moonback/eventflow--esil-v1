import React, { useState, type ComponentType, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import {
  Search, Filter, Plus, Package, X, ChevronRight,
  Wrench, AlertTriangle, Warehouse, Truck, Tag,
  Weight, Hash, Clock, CheckCircle, Euro
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Equipment, EquipmentCategory, EquipmentStatus, MissionEquipment } from '../types';

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: EquipmentCategory; label: string; emoji: string }[] = [
  { value: 'audio',     label: 'Audio',      emoji: '🔊' },
  { value: 'lighting',  label: 'Lumière',    emoji: '💡' },
  { value: 'video',     label: 'Vidéo',      emoji: '📹' },
  { value: 'structure', label: 'Structure',  emoji: '🏗️' },
  { value: 'power',     label: 'Énergie',    emoji: '⚡' },
  { value: 'furniture', label: 'Mobilier',   emoji: '🪑' },
];

const STATUS_META: Record<EquipmentStatus, { label: string; color: string; bg: string; icon: ComponentType<{ className?: string }> }> = {
  warehouse:   { label: 'En Magasin',      color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-200', icon: Warehouse },
  on_mission:  { label: 'En Prestation',   color: 'text-blue-700',    bg: 'bg-blue-50 border border-blue-200',       icon: Truck },
  maintenance: { label: 'En Maintenance',  color: 'text-amber-700',   bg: 'bg-amber-50 border border-amber-200',     icon: Wrench },
  lost:        { label: 'Perdu / Volé',    color: 'text-red-700',     bg: 'bg-red-50 border border-red-200',         icon: AlertTriangle },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function generateQrCode(category: EquipmentCategory, index: number) {
  const prefix = category.substring(0, 3).toUpperCase();
  return `QR-${prefix}-${index.toString().padStart(3, '0')}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 flex flex-col gap-1 min-w-[110px]">
      <span className={cn('text-2xl font-bold', color)}>{value}</span>
      <span className="text-xs text-slate-500 font-medium leading-tight">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: EquipmentStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide', meta.bg, meta.color)}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
}

// ─── Add Equipment Modal ───────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void;
  equipmentCount: number;
  categoryCount: Record<string, number>;
}

function AddEquipmentModal({ onClose, equipmentCount, categoryCount }: AddModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('audio');
  const [status, setStatus] = useState<EquipmentStatus>('warehouse');
  const [weightKg, setWeightKg] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('La désignation est requise.'); return; }
    setSaving(true);
    setError('');
    try {
      const idx = (categoryCount[category] ?? 0) + 1;
      await dbMutations.addEquipment({
        id: `eq-${Date.now()}`,
        qrCode: generateQrCode(category, idx),
        name: name.trim(),
        brand: brand.trim() || 'Générique',
        category,
        status,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        dailyRate: dailyRate ? parseFloat(dailyRate) : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de l\'ajout.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Ajouter du matériel</h2>
              <p className="text-blue-200 text-xs">{equipmentCount} référence(s) dans le parc</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Désignation */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Désignation <span className="text-red-500">*</span>
            </label>
            <input
              id="eq-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Enceinte L-Acoustics K2"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              autoFocus
            />
          </div>

          {/* Marque + Catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Marque</label>
              <input
                id="eq-brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ex: L-Acoustics"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Catégorie</label>
              <select
                id="eq-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Statut initial + Poids + Tarif */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Statut Initial</label>
              <select
                id="eq-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
              >
                <option value="warehouse">En Magasin</option>
                <option value="maintenance">En Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">
                Poids (kg)
              </label>
              <input
                id="eq-weight"
                type="number"
                min="0"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 truncate">
                Tarif /j (€)
              </label>
              <input
                id="eq-rate"
                type="number"
                min="0"
                step="0.01"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <Hash className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">QR Code généré automatiquement</p>
              <code className="text-sm font-mono text-slate-700 font-bold">
                {generateQrCode(category, (categoryCount[category] ?? 0) + 1)}
              </code>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Plus className="w-4 h-4" /> Ajouter</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Equipment Detail Drawer ───────────────────────────────────────────────────

interface DrawerProps {
  equipment: Equipment;
  missions: { id: string; title: string; client: string; startDate: string; endDate: string; status: string }[];
  missionEquipment: MissionEquipment[];
  onClose: () => void;
  onStatusChange: (id: string, status: EquipmentStatus) => void;
}

function EquipmentDrawer({ equipment, missions, missionEquipment, onClose, onStatusChange }: DrawerProps) {
  const [changingStatus, setChangingStatus] = useState(false);
  const meta = STATUS_META[equipment.status];
  const cat = CATEGORIES.find(c => c.value === equipment.category);

  // Missions où ce matériel a été utilisé
  const usedIn = missionEquipment
    .filter(me => me.equipmentId === equipment.id)
    .map(me => ({
      me,
      mission: missions.find(m => m.id === me.missionId),
    }))
    .filter(x => x.mission)
    .sort((a, b) => b.mission!.startDate.localeCompare(a.mission!.startDate));

  const handleStatus = async (newStatus: EquipmentStatus) => {
    setChangingStatus(true);
    await onStatusChange(equipment.id, newStatus);
    setChangingStatus(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl shrink-0">
            {cat?.emoji ?? '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900 text-lg leading-tight truncate">{equipment.name}</h2>
            <p className="text-slate-500 text-sm">{equipment.brand} · {cat?.label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Info cards */}
          <div className="px-6 py-5 space-y-4">
            {/* Statut */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Statut actuel</p>
              <StatusBadge status={equipment.status} />

              {/* Changer le statut */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Changer le statut</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(STATUS_META) as EquipmentStatus[])
                    .filter(s => s !== equipment.status)
                    .map(s => {
                      const m = STATUS_META[s];
                      const Icon = m.icon;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatus(s)}
                          disabled={changingStatus}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all hover:scale-105 active:scale-95 disabled:opacity-60',
                            m.bg, m.color
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          {m.label}
                        </button>
                      );
                    })
                  }
                </div>
              </div>
            </div>

            {/* Identifiants */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Identifiants</p>
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400">QR Code</p>
                  <code className="text-sm font-mono font-bold text-slate-800">{equipment.qrCode}</code>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400">ID Interne</p>
                  <code className="text-xs font-mono text-slate-500">{equipment.id}</code>
                </div>
              </div>
              {equipment.weightKg && (
                <div className="flex items-center gap-3">
                  <Weight className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">Poids</p>
                    <p className="text-sm font-semibold text-slate-800">{equipment.weightKg} kg</p>
                  </div>
                </div>
              )}
              {equipment.dailyRate !== undefined && (
                <div className="flex items-center gap-3">
                  <Euro className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400">Tarif Journalier</p>
                    <p className="text-sm font-semibold text-slate-800">{equipment.dailyRate.toFixed(2)} €</p>
                  </div>
                </div>
              )}
            </div>

            {/* Historique missions */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Historique des missions ({usedIn.length})
              </p>
              {usedIn.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                  <Package className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">Jamais utilisé en mission.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usedIn.map(({ me, mission }) => (
                    <div key={me.missionId} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{mission!.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{mission!.client}</p>
                        </div>
                        <span className={cn(
                          'shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold',
                          mission!.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'
                        )}>
                          {mission!.status}
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div>
                          <p className="font-bold text-slate-700">{me.plannedQuantity}</p>
                          <p className="text-slate-400">Prévus</p>
                        </div>
                        <div>
                          <p className="font-bold text-blue-700">{me.loadedQuantity}</p>
                          <p className="text-slate-400">Chargés</p>
                        </div>
                        <div>
                          <p className={cn('font-bold', me.returnedQuantity === me.plannedQuantity ? 'text-emerald-700' : 'text-amber-700')}>
                            {me.returnedQuantity}
                          </p>
                          <p className="text-slate-400">Retournés</p>
                        </div>
                      </div>
                      {(me.outScanTime || me.inScanTime) && (
                        <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
                          {me.outScanTime && <span>↑ Sortie : {new Date(me.outScanTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                          {me.inScanTime && <span>↓ Retour : {new Date(me.inScanTime).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">Mis à jour automatiquement</span>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">Synchronisé</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────

export function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EquipmentStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);

  const equipment = useLiveQuery(() => db.equipment.toArray()) ?? [];
  const missions = useLiveQuery(() => db.missions.toArray()) ?? [];
  const missionEquipment = useLiveQuery(() => db.missionEquipment.toArray()) ?? [];

  // KPIs
  const kpis = {
    total: equipment.length,
    warehouse: equipment.filter(e => e.status === 'warehouse').length,
    on_mission: equipment.filter(e => e.status === 'on_mission').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    lost: equipment.filter(e => e.status === 'lost').length,
  };

  // Count per category for QR generation
  const categoryCount = equipment.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtered list
  const filteredEq = equipment.filter(e => {
    if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!e.name.toLowerCase().includes(q) && !e.qrCode.toLowerCase().includes(q) && !e.brand.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleStatusChange = async (id: string, status: EquipmentStatus) => {
    await dbMutations.updateEquipmentStatus(id, status, status === 'on_mission' ? undefined : undefined);
    // Refresh selected
    if (selectedEq?.id === id) {
      setSelectedEq(prev => prev ? { ...prev, status } : null);
    }
  };

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 h-full flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parc Matériel</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestion des stocks et suivi des équipements.</p>
        </div>
        <button
          id="add-equipment-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-blue-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Ajouter du matériel
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <KpiCard label="Total Parc" value={kpis.total} color="text-slate-800" />
        <KpiCard label="En Magasin" value={kpis.warehouse} color="text-emerald-600" />
        <KpiCard label="En Prestation" value={kpis.on_mission} color="text-blue-600" />
        <KpiCard label="Maintenance" value={kpis.maintenance} color="text-amber-600" />
        {kpis.lost > 0 && <KpiCard label="Perdu / Volé" value={kpis.lost} color="text-red-600" />}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="inventory-search"
            type="text"
            placeholder="Rechercher par nom, marque ou QR code..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            id="category-filter"
            className="pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[170px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
          >
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
        <div className="relative">
          <select
            id="status-filter"
            className="pl-4 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">Tous les statuts</option>
            {(Object.keys(STATUS_META) as EquipmentStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3.5 text-[11px] uppercase text-slate-500 font-bold tracking-wider">QR Code</th>
                <th className="px-5 py-3.5 text-[11px] uppercase text-slate-500 font-bold tracking-wider">Désignation</th>
                <th className="px-5 py-3.5 text-[11px] uppercase text-slate-500 font-bold tracking-wider hidden md:table-cell">Marque</th>
                <th className="px-5 py-3.5 text-[11px] uppercase text-slate-500 font-bold tracking-wider hidden lg:table-cell">Catégorie</th>
                <th className="px-5 py-3.5 text-[11px] uppercase text-slate-500 font-bold tracking-wider">Statut</th>
                <th className="px-5 py-3.5 text-[11px] uppercase text-slate-500 font-bold tracking-wider text-right">Suivi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredEq.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Package className="w-10 h-10 text-slate-200" />
                      <p className="font-medium">Aucun équipement trouvé.</p>
                      {equipment.length === 0 && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="mt-1 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          <Plus className="w-4 h-4" /> Ajouter votre premier matériel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEq.map(eq => {
                  const cat = CATEGORIES.find(c => c.value === eq.category);
                  return (
                    <tr
                      key={eq.id}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => setSelectedEq(eq)}
                    >
                      <td className="px-5 py-3.5">
                        <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono border border-slate-200">
                          {eq.qrCode}
                        </code>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{eq.name}</td>
                      <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{eq.brand}</td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-slate-600 text-sm">{cat?.emoji} {cat?.label}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={eq.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          id={`eq-detail-${eq.id}`}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors text-xs font-semibold group-hover:text-blue-600"
                          onClick={(e) => { e.stopPropagation(); setSelectedEq(eq); }}
                        >
                          Suivi <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 text-xs text-slate-400 font-medium flex justify-between items-center">
          <span>{filteredEq.length} référence(s) affichée(s) sur {equipment.length}</span>
          <span className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" />
            Synchronisé
          </span>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddEquipmentModal
          onClose={() => setShowAddModal(false)}
          equipmentCount={equipment.length}
          categoryCount={categoryCount}
        />
      )}

      {selectedEq && (
        <EquipmentDrawer
          equipment={selectedEq}
          missions={missions as any}
          missionEquipment={missionEquipment}
          onClose={() => setSelectedEq(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
