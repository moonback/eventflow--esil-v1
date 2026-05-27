import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { QrCode, ArrowRight, Truck, CheckCircle2, ChevronRight, AlertTriangle, WifiOff, X, Camera, ScanLine, MapPin, Play, Hammer } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Mission, Equipment, MissionEquipment } from '../types';

export function MobileView() {
  const [offlineMode] = useState(true); // Simulated lack of connection for demo
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isReportingIncident, setIsReportingIncident] = useState(false);
  const [incidentText, setIncidentText] = useState('');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const missions = useLiveQuery(() => db.missions.filter(m => m.status !== 'completed').toArray()) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray()) || [];
  const missionEquipments = useLiveQuery(() => db.missionEquipment.toArray()) || [];
  
  // Fake "assigned to me" view (s-3 Marc Vasseur)
  // Show all missions in mobile view; adjust filter as needed for user-specific missions
  const myMissions = missions;

  const handleIncidentSubmit = async () => {
    if (!incidentText.trim()) return;
    
    await dbMutations.addIncident({
      id: `i-${Date.now()}`,
      missionId: activeMission?.id || 'm-unknown',
      reportedBy: 's-3', 
      description: incidentText,
      status: 'open',
      createdAt: new Date().toISOString()
    });
    
    setIncidentText('');
    setIsReportingIncident(false);
  };

  const statusLabels: Record<string, { label: string, color: string }> = {
    planned: { label: 'À charger', color: 'bg-slate-100 text-slate-700' },
    loading: { label: 'Chargement en cours', color: 'bg-amber-100 text-amber-700' },
    en_route: { label: 'En route', color: 'bg-blue-100 text-blue-700' },
    installing: { label: 'Montage', color: 'bg-green-100 text-green-700' },
    live: { label: 'Live', color: 'bg-red-100 text-red-700' },
    dismantling: { label: 'Démontage', color: 'bg-pink-100 text-pink-700' },
    returning: { label: 'Retour', color: 'bg-indigo-100 text-indigo-700' }
  };

  const handleScanSimulation = async (isSuccess: boolean) => {
    if (!activeMission) return;
    
    // Pick an equipment associated with this mission that hasn't been loaded yet
    const missionQs = missionEquipments.filter(me => me.missionId === activeMission.id && me.loadedQuantity < me.plannedQuantity);
    
    if (missionQs.length === 0) {
      setScanError("Tout le matériel a déjà été chargé !");
      setTimeout(() => setScanError(null), 2000);
      return;
    }

    const eqToLoad = equipment.find(e => e.id === missionQs[0].equipmentId);
    
    if (eqToLoad) {
      setScanResult(`Scanné: ${eqToLoad.name} (${eqToLoad.qrCode})`);
      
      // Update DB
      await dbMutations.updateMissionEquipment(activeMission.id, eqToLoad.id, {
        loadedQuantity: missionQs[0].loadedQuantity + 1,
        outScanTime: new Date().toISOString()
      });
      
      setTimeout(() => setScanResult(null), 2000);
    }
  };

  if (activeMission && !isScanning) {
    const missionEqList = missionEquipments.filter(me => me.missionId === activeMission.id);
    const totalPlanned = missionEqList.reduce((acc, me) => acc + me.plannedQuantity, 0);
    const totalLoaded = missionEqList.reduce((acc, me) => acc + me.loadedQuantity, 0);
    const progress = totalPlanned === 0 ? 0 : Math.round((totalLoaded / totalPlanned) * 100);

    const isLoadComplete = progress === 100;
    
    const advanceStatus = async () => {
      const nextMap: Record<string, string> = {
        planned: 'loading',
        loading: 'en_route',
        en_route: 'installing',
        installing: 'live',
        live: 'dismantling',
        dismantling: 'returning',
        returning: 'completed'
      };
      
      const current = activeMission.status;
      const next = nextMap[current] as any;
      if (next) {
        await dbMutations.updateMissionStatus(activeMission.id, next);
        setActiveMission(prev => prev ? { ...prev, status: next } : null);
      }
    };
    
    // Determine the main action text based on status
    let actionElement = null;
    if (activeMission.status === 'planned' || activeMission.status === 'loading') {
      if (activeMission.status === 'planned') {
        // Auto transition to loading on first load
        dbMutations.updateMissionStatus(activeMission.id, 'loading');
        setActiveMission(prev => ({ ...prev!, status: 'loading' }));
      }
      actionElement = (
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => setIsScanning(true)}
            className="w-full bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md uppercase tracking-wider"
          >
            <Camera className="w-5 h-5" />
            Scanner un code QR
          </button>
          
          {isLoadComplete && (
            <button 
              onClick={advanceStatus}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md uppercase tracking-wider transition-colors"
            >
              <Truck className="w-5 h-5" />
              Départ Entrepôt (En route)
            </button>
          )}
        </div>
      );
    } else {
      // Mapping for other statuses
      const statusActionMap: Record<string, { label: string, icon: any, color: string }> = {
        en_route: { label: 'Sur site (Début Montage)', icon: MapPin, color: 'bg-indigo-600 hover:bg-indigo-700' },
        installing: { label: 'Montage Terminé (Live)', icon: Play, color: 'bg-green-600 hover:bg-green-700' },
        live: { label: 'Fin de presta (Démontage)', icon: Hammer, color: 'bg-pink-600 hover:bg-pink-700' },
        dismantling: { label: 'Camion chargé (Retour)', icon: Truck, color: 'bg-amber-600 hover:bg-amber-700' },
        returning: { label: 'Retour Entrepôt (Terminer)', icon: CheckCircle2, color: 'bg-slate-800 hover:bg-slate-900' },
      };
      
      const config = statusActionMap[activeMission.status];
      if (config) {
        actionElement = (
           <button 
            onClick={advanceStatus}
            className={cn("w-full text-white rounded-xl py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-md uppercase tracking-wider transition-colors", config.color)}
          >
            <config.icon className="w-5 h-5" />
            {config.label}
          </button>
        );
      } else {
        actionElement = (
          <div className="w-full bg-green-100 text-green-800 rounded-xl py-3.5 text-sm font-bold text-center uppercase tracking-wider">
            Mission Terminée
          </div>
        );
      }
    }

    return (
      <div className="flex flex-col h-full bg-slate-50 max-w-md mx-auto w-full md:border-x border-slate-200 shadow-sm relative pb-20 md:pb-0">
        <div className="p-4 bg-[#1E293B] text-white flex items-center justify-between shadow-xl z-10 shrink-0">
          <button onClick={() => setActiveMission(null)} className="p-2 -ml-2 text-slate-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="font-bold tracking-widest text-center flex-1">MISSION {activeMission.id.toUpperCase()}</div>
          <div className="w-9"></div> {/* Spacer for centering */}
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="font-bold text-xl text-slate-900 mb-1 leading-tight">{activeMission.title}</h2>
            <div className="text-sm text-slate-500 font-serif italic mb-4">{activeMission.location}</div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progression Chargement</span>
                <span className="text-sm font-bold text-blue-600">{totalLoaded} / {totalPlanned}</span>
              </div>
              <div className="h-2.5 bg-slate-200 rounded-full w-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>

          <div>
             <div className="flex items-center justify-between mb-3 px-1">
               <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liste de colisage</h3>
               {isLoadComplete && <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Complet</span>}
             </div>
             
             <div className="space-y-2">
               {missionEqList.map(me => {
                 const eq = equipment.find(e => e.id === me.equipmentId);
                 if (!eq) return null;
                 const isComplete = me.loadedQuantity >= me.plannedQuantity;
                 
                 return (
                   <div key={me.equipmentId} className={cn("p-3 rounded-xl border flex items-center justify-between transition-colors", isComplete ? "bg-green-50/50 border-green-100" : "bg-white border-slate-200 shadow-sm")}>
                     <div className="flex items-center gap-3">
                       <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 border", isComplete ? "bg-green-500 border-green-600 text-white" : "bg-slate-100 border-slate-200 text-slate-300")}>
                         {isComplete && <CheckCircle2 className="w-4 h-4" />}
                       </div>
                       <div className="flex flex-col">
                         <span className={cn("text-sm font-medium", isComplete ? "text-slate-600" : "text-slate-900")}>{eq.name}</span>
                         <span className="text-[10px] text-slate-400 font-mono mt-0.5">{eq.qrCode}</span>
                       </div>
                     </div>
                     <span className={cn("text-xs font-bold w-12 text-right", isComplete ? "text-green-600" : "text-slate-500")}>
                       {me.loadedQuantity} / {me.plannedQuantity}
                     </span>
                   </div>
                 )
               })}
             </div>
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-200 shrink-0">
          {actionElement}
        </div>
      </div>
    );
  }

  if (isScanning && activeMission) {
    return (
      <div className="flex flex-col h-full bg-black max-w-md mx-auto w-full relative">
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
          <button onClick={() => setIsScanning(false)} className="p-2 text-white/70 hover:text-white rounded-full bg-black/40 backdrop-blur-md">
            <X className="w-6 h-6" />
          </button>
          <div className="text-white text-xs font-bold tracking-widest uppercase">Scanner {activeMission.id}</div>
          <div className="w-10"></div>
        </div>

        {/* Fake Camera Viewfinder */}
        <div className="flex-1 relative flex items-center justify-center">
           <div className="absolute inset-0 bg-slate-900" />
           <div className="absolute inset-0 opacity-20" style={{ backgroundSize: '20px 20px', backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)' }} />
           
           <div className="relative z-10 w-64 h-64 border-2 border-white/20 rounded-2xl flex items-center justify-center">
             <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl" />
             <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl" />
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl" />
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl" />
             
             <ScanLine className="w-full h-full text-blue-500/30 animate-pulse absolute inset-0" />
             <div className="w-full h-0.5 bg-blue-500 absolute top-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
           </div>

           {scanResult && (
             <div className="absolute bottom-32 bg-green-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
               <CheckCircle2 className="w-5 h-5" />
               {scanResult}
             </div>
           )}
           
           {scanError && (
             <div className="absolute bottom-32 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-5">
               <AlertTriangle className="w-5 h-5" />
               {scanError}
             </div>
           )}
        </div>

        <div className="p-8 bg-black z-20 shrink-0 mb-safe flex flex-col items-center">
          <p className="text-white/50 text-xs text-center mb-6 font-medium">Cadrez le code QR dans la zone au-dessus.<br/>(Cliquez ci-dessous pour simuler un scan)</p>
          <button 
            onClick={() => handleScanSimulation(true)}
            className="w-16 h-16 rounded-full bg-white/10 border-4 border-white flex items-center justify-center hover:bg-white/20 transition-colors focus:ring-4 focus:ring-blue-500/50 outline-none"
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-full bg-slate-50 max-w-md mx-auto w-full md:border-x border-slate-200 shadow-sm relative pb-20 md:pb-0">
      
      {offlineMode && (
        <div className="bg-amber-100 text-amber-800 text-xs px-4 py-2 flex items-center gap-2 justify-center font-medium sticky top-0 z-20">
          <WifiOff className="w-3.5 h-3.5" />
          Mode hors-ligne actif (Données en cache protégées)
        </div>
      )}

      <div className="p-4 bg-white border-b border-slate-200 shrink-0">
        <h1 className="text-xl font-bold mb-1 text-slate-900">Mes Missions</h1>
        <p className="text-sm text-slate-500">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {myMissions.length === 0 ? (
          <div className="text-center p-8 text-slate-500 text-sm">
            Vous n'avez pas de mission assignée aujourd'hui.
          </div>
        ) : (
          myMissions.map(mission => {
            const ms = statusLabels[mission.status] || { label: mission.status, color: 'bg-slate-200 text-slate-700'};
            
            return (
            <div key={mission.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden active:scale-[0.98] transition-transform flex flex-col relative">
              <div className="p-4 border-b border-slate-100 relative">
                <div className={cn("absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", ms.color)}>
                  {ms.label}
                </div>
                <p className="text-xs text-slate-500 font-medium mb-1 tracking-widest uppercase">Départ imminent</p>
                <h3 className="font-bold text-lg leading-tight mb-2 pr-24 text-slate-900">{mission.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-1 italic font-serif">{mission.location}</p>
              </div>
              
              <div className="flex bg-slate-50 divide-x divide-slate-200 p-3 leading-tight border-b border-slate-100">
                <div className="flex-1 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Véhicule</span>
                  <span className="font-medium text-sm flex items-center gap-1.5 mt-0.5 text-blue-600">
                    <Truck className="w-3.5 h-3.5 text-blue-500" />
                    {mission.vehicleId === 'v-2' ? 'Iveco (EF-456)' : mission.vehicleId || 'Non assigné'}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Matériel</span>
                  <span className="font-medium text-sm text-blue-600 mt-0.5">
                    {missionEquipments.filter(me => me.missionId === mission.id).reduce((acc, me) => acc + me.plannedQuantity, 0)} items
                  </span>
                </div>
              </div>

              <div className="p-3 bg-white">
                 <button 
                  onClick={() => setActiveMission(mission)}
                  className="w-full bg-[#1E293B] hover:bg-slate-800 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
                 >
                   {mission.status === 'planned' ? 'Préparer le chargement' : 'Gérer la mission'}
                   <ArrowRight className="w-4 h-4" />
                 </button>
              </div>
            </div>
          )})
        )}

        {/* Quick Actions Scan */}
        <div className="mt-8">
           <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Actions Rapides</h2>
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center h-24 gap-2 text-center active:bg-slate-50 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-1">
                  <QrCode className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700">Scanner un FLIGHT</span>
              </div>
              <div 
                onClick={() => setIsReportingIncident(true)}
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center h-24 gap-2 text-center active:bg-slate-50 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mb-1">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700">Signaler une PANNE</span>
              </div>
           </div>
        </div>
      </div>
      
      {isReportingIncident && (
        <div className="absolute inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-900">Signaler un Incident</h3>
              <button onClick={() => setIsReportingIncident(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none h-32"
              placeholder="Décrivez le problème rencontré (ex: Câble XLR défectueux, retard sur le trajet)..."
              value={incidentText}
              onChange={(e) => setIncidentText(e.target.value)}
            />
            
            <button 
              onClick={handleIncidentSubmit}
              disabled={!incidentText.trim()}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-red-700 transition-colors shadow-sm"
            >
              Envoyer le signalement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
