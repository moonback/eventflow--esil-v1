import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { ArrowLeft, CheckCircle, CreditCard, PenTool, X, QrCode } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { QRCodeSVG } from 'qrcode.react';

export function QuoteView() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const sigCanvas = useRef<SignatureCanvas>(null);

  const quote = useLiveQuery(() => quoteId ? db.quotes.get(quoteId) : undefined, [quoteId]);
  const client = useLiveQuery(() => quote ? db.clients.get(quote.clientId) : undefined, [quote]);
  const items = useLiveQuery(() => quoteId ? db.quoteItems.where('quoteId').equals(quoteId).toArray() : [], [quoteId]) || [];

  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [missionCreated, setMissionCreated] = useState<string | null>(null);

  if (!quote || !client) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <div className="w-16 h-16 mb-4 rounded-full bg-slate-200 animate-pulse" />
        <p>Chargement du devis...</p>
      </div>
    );
  }

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSaveSignature = async () => {
    if (sigCanvas.current?.isEmpty()) return alert("Veuillez signer le devis");
    
    const signatureData = sigCanvas.current?.toDataURL();
    if (signatureData) {
      await dbMutations.updateQuote({ ...quote, status: 'signed', signatureData });
      setIsSignModalOpen(false);
      setIsStripeModalOpen(true); // Passage à l'acompte
    }
  };

  const handleSimulatePayment = async () => {
    // 1. Mettre à jour le statut du client en 'active'
    await dbMutations.updateClient({ ...client, status: 'active', pipelineStage: 'won' });

    // 2. Créer la mission auto
    const missionId = `m-${Date.now()}`;
    const endDate = new Date(quote.validityDate); // Exemple simple
    endDate.setDate(endDate.getDate() + 1);

    await dbMutations.addMission({
      id: missionId,
      title: `Mission - ${client.name}`,
      client: client.name, // Nom du client pour rétrocompatibilité
      location: client.address || 'Lieu à définir',
      startDate: quote.validityDate,
      endDate: endDate.toISOString(),
      status: 'planned',
      staffIds: [],
      vehicleId: null
    });

    // 3. Créer une facture d'acompte (30%)
    await dbMutations.addInvoice({
      id: `inv-${Date.now()}`,
      quoteId: quote.id,
      missionId: missionId,
      amount: quote.totalAmount * 0.3, // 30% d'acompte
      status: 'paid',
      createdAt: new Date().toISOString()
    });

    // 4. Update quote to invoiced
    await dbMutations.updateQuote({ ...quote, status: 'invoiced' });

    setIsStripeModalOpen(false);
    setMissionCreated(missionId);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="h-14 border-b border-slate-200 bg-white flex items-center px-4 shrink-0 shadow-sm z-10 relative">
        <button 
          onClick={() => navigate(`/clients/${client.id}`)}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au client
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-3xl bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
          
          <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Devis {quote.id.split('-')[1]}</h1>
              <p className="text-slate-500">Pour : <span className="font-semibold text-slate-700">{client.name}</span></p>
              <p className="text-slate-500">Statut : <span className="font-semibold uppercase tracking-wider text-xs ml-1 bg-slate-100 px-2 py-0.5 rounded">{quote.status}</span></p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-1">Montant Total TTC</p>
              <p className="text-4xl font-black text-indigo-600">{quote.totalAmount.toFixed(2)} €</p>
              <p className="text-xs text-slate-400 mt-2">Acompte requis : {(quote.totalAmount * 0.3).toFixed(2)} € (30%)</p>
            </div>
          </div>

          <div className="space-y-3 mb-10">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-800">{item.description}</p>
                  <p className="text-xs text-slate-500">Qté: {item.quantity} × {item.unitPrice.toFixed(2)} €</p>
                </div>
                <div className="font-bold text-slate-700">
                  {(item.quantity * item.unitPrice).toFixed(2)} €
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            {quote.status === 'draft' || quote.status === 'sent' ? (
              <button 
                onClick={() => setIsSignModalOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200"
              >
                <PenTool className="w-5 h-5" />
                Valider et Signer
              </button>
            ) : quote.status === 'signed' ? (
              <button 
                onClick={() => setIsStripeModalOpen(true)}
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-200"
              >
                <CreditCard className="w-5 h-5" />
                Payer l'Acompte
              </button>
            ) : missionCreated ? (
              <div className="text-center p-8 bg-emerald-50 rounded-3xl border border-emerald-100 w-full">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-emerald-800 mb-2">Devis validé !</h3>
                <p className="text-emerald-600 mb-6">La mission a été automatiquement planifiée et la facture d'acompte générée.</p>
                
                <div className="bg-white p-6 rounded-2xl shadow-sm inline-block">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Scanner pour accéder à la mission</p>
                  <QRCodeSVG value={`${window.location.origin}/planning?mission=${missionCreated}`} size={160} className="mx-auto" />
                </div>
                
                <div className="mt-8">
                  <button onClick={() => navigate('/planning')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors">
                    Voir dans le Planning
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Modal de Signature */}
      {isSignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-800">Signature Électronique</h3>
              <button onClick={() => setIsSignModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 bg-slate-50">
              <p className="text-sm text-slate-600 mb-4 text-center">Veuillez signer ci-dessous pour valider le devis.</p>
              <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 overflow-hidden shadow-inner">
                <SignatureCanvas 
                  ref={sigCanvas} 
                  penColor="#4f46e5"
                  canvasProps={{ className: 'w-full h-48' }} 
                />
              </div>
              <div className="flex justify-end mt-2">
                <button onClick={handleClearSignature} className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">Effacer</button>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsSignModalOpen(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Annuler
              </button>
              <button onClick={handleSaveSignature} className="flex-1 py-3 text-white font-bold bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-md">
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Stripe Mock */}
      {isStripeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden text-center flex flex-col">
            <div className="bg-[#635BFF] p-8 text-white relative">
              <button onClick={() => setIsStripeModalOpen(false)} className="absolute top-4 right-4 text-white/50 hover:text-white">
                <X className="w-6 h-6" />
              </button>
              <CreditCard className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h3 className="text-2xl font-bold">Paiement Sécurisé</h3>
              <p className="text-white/80 mt-2">Acompte de 30%</p>
            </div>
            <div className="p-8">
              <p className="text-4xl font-black text-slate-800 mb-8">{(quote.totalAmount * 0.3).toFixed(2)} €</p>
              
              <div className="space-y-3 mb-8 text-left">
                <input disabled type="text" placeholder="Numéro de carte : **** **** **** 4242" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono text-sm" />
                <div className="flex gap-3">
                  <input disabled type="text" placeholder="MM/AA : 12/26" className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono text-sm" />
                  <input disabled type="text" placeholder="CVC : 123" className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-mono text-sm" />
                </div>
              </div>

              <button 
                onClick={handleSimulatePayment} 
                className="w-full py-4 text-white font-bold bg-[#635BFF] rounded-xl hover:bg-[#524BDE] transition-colors shadow-lg shadow-[#635BFF]/30 flex items-center justify-center gap-2"
              >
                Payer maintenant
              </button>
              <p className="text-xs text-slate-400 mt-4 flex items-center justify-center gap-1">
                Propulsé par Stripe (Mode Test)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
