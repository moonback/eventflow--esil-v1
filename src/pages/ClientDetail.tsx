import { useParams, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ClientProfilePanel } from '../components/ClientProfilePanel';
import { ArrowLeft } from 'lucide-react';

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  
  const client = useLiveQuery(() => 
    clientId ? db.clients.get(clientId) : undefined
  , [clientId]);

  if (!client) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-200 animate-pulse" />
        <p>Chargement du profil client...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="h-14 border-b border-slate-200 bg-white flex items-center px-4 shrink-0 shadow-sm z-10 relative">
        <button 
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux clients
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        <ClientProfilePanel client={client} />
      </div>
    </div>
  );
}
