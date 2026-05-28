import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbMutations } from '../db/db';
import { Quote, QuoteItem, Client } from '../types';
import { useNavigate } from 'react-router';
import { Plus, Trash2, FileText, Download, ArrowLeft, Save } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export function QuoteBuilder() {
  const navigate = useNavigate();
  const clients = useLiveQuery(() => db.clients.toArray()) || [];
  const equipment = useLiveQuery(() => db.equipment.toArray()) || [];
  
  const [selectedClientId, setSelectedClientId] = useState('');
  const [items, setItems] = useState<Partial<QuoteItem>[]>([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [validityDays, setValidityDays] = useState(30);

  const pdfRef = useRef<HTMLDivElement>(null);
  const selectedClient = clients.find(c => c.id === selectedClientId);

  const totalHT = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
  const tva = totalHT * 0.20; // 20% TVA par défaut
  const totalTTC = totalHT + tva;

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill price if equipment is selected
    if (field === 'description') {
      const matchedEq = equipment.find(eq => eq.name === value);
      if (matchedEq && matchedEq.dailyRate) {
        newItems[index].unitPrice = matchedEq.dailyRate;
      }
    }
    
    setItems(newItems);
  };

  const handleSaveQuote = async () => {
    if (!selectedClientId) return alert("Veuillez sélectionner un client");
    if (items.some(i => !i.description)) return alert("Toutes les lignes doivent avoir une description");

    const quoteId = `q-${Date.now()}`;
    const validityDate = format(addDays(new Date(), validityDays), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");

    const newQuote: Quote = {
      id: quoteId,
      clientId: selectedClientId,
      status: 'draft',
      totalAmount: totalTTC,
      validityDate: validityDate,
      createdAt: new Date().toISOString()
    };

    await dbMutations.addQuote(newQuote);

    for (const item of items) {
      await dbMutations.addQuoteItem({
        id: `qi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        quoteId: quoteId,
        description: item.description!,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0
      });
    }

    alert("Devis enregistré !");
    navigate(`/quotes/${quoteId}`);
  };

  const generatePDF = () => {
    if (!pdfRef.current || !selectedClient) return;
    const element = pdfRef.current;
    
    const opt = {
      margin:       10,
      filename:     `Devis_${selectedClient.name.replace(/\\s+/g, '_')}_${format(new Date(), 'ddMMyyyy')}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10 relative">
        <button 
          onClick={() => navigate('/clients')}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="flex items-center gap-2">
          <button 
            onClick={generatePDF}
            disabled={!selectedClientId}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button 
            onClick={handleSaveQuote}
            disabled={!selectedClientId}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Éditeur */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Nouveau Devis
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Client</label>
                <select 
                  value={selectedClientId} 
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Sélectionner un client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Validité (jours)</label>
                <input 
                  type="number" 
                  value={validityDays} 
                  onChange={e => setValidityDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Lignes du devis</h3>
            
            <div className="space-y-3 mb-4">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <input 
                      type="text" 
                      list="equipment-list"
                      placeholder="Description de la prestation / matériel..."
                      value={item.description}
                      onChange={e => handleItemChange(idx, 'description', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="w-20">
                    <input 
                      type="number" 
                      min="1"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="w-28 relative">
                    <input 
                      type="number" 
                      value={item.unitPrice}
                      onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full pl-3 pr-8 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">€</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-0.5"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            <datalist id="equipment-list">
              {equipment.map(eq => (
                <option key={eq.id} value={eq.name} />
              ))}
            </datalist>

            <button 
              onClick={handleAddItem}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Ajouter une ligne
            </button>
          </div>
        </div>

        {/* Aperçu PDF (Invisible en impression mais sert de template) */}
        <div className="bg-slate-200/50 p-4 rounded-2xl overflow-y-auto">
          <div className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Aperçu du Devis</div>
          <div 
            ref={pdfRef} 
            className="bg-white w-full max-w-[210mm] min-h-[297mm] mx-auto p-12 shadow-md relative text-slate-800"
            style={{ fontSize: '14px' }}
          >
            {/* En-tête Devis */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-4xl font-bold text-indigo-600 tracking-tight mb-1">EVENTFLOW</h1>
                <p className="text-slate-500 text-sm">Agence d'Événementiel & Location</p>
                <div className="mt-4 text-sm text-slate-600">
                  <p>123 Avenue des Champs</p>
                  <p>75000 Paris, France</p>
                  <p>contact@eventflow.com</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-light text-slate-300 mb-4 uppercase tracking-widest">Devis</h2>
                <div className="text-sm">
                  <p className="text-slate-500">Date: <span className="text-slate-800 font-medium">{format(new Date(), 'dd/MM/yyyy')}</span></p>
                  <p className="text-slate-500">Validité: <span className="text-slate-800 font-medium">{format(addDays(new Date(), validityDays), 'dd/MM/yyyy')}</span></p>
                  <p className="text-slate-500 mt-2">N° Devis: <span className="text-slate-800 font-medium">D-{format(new Date(), 'yyyyMMdd')}-01</span></p>
                </div>
              </div>
            </div>

            {/* Info Client */}
            <div className="mb-10 p-5 bg-slate-50 rounded-xl inline-block min-w-[300px]">
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Devis pour :</p>
              {selectedClient ? (
                <>
                  <p className="font-bold text-lg">{selectedClient.name}</p>
                  <p className="text-slate-600">{selectedClient.address || "Adresse non renseignée"}</p>
                  <p className="text-slate-600">{selectedClient.city} {selectedClient.country}</p>
                  <p className="text-slate-600 mt-1">{selectedClient.email}</p>
                </>
              ) : (
                <p className="text-slate-400 italic">Veuillez sélectionner un client...</p>
              )}
            </div>

            {/* Tableau des prestations */}
            <table className="w-full mb-10 text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider">Description</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider text-center w-20">Qté</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider text-right w-28">Prix U. HT</th>
                  <th className="py-3 font-semibold uppercase text-xs tracking-wider text-right w-32">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-4">{item.description || <span className="text-slate-300 italic">Ligne vide...</span>}</td>
                    <td className="py-4 text-center">{item.quantity}</td>
                    <td className="py-4 text-right">{(item.unitPrice || 0).toFixed(2)} €</td>
                    <td className="py-4 text-right font-medium">{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totaux */}
            <div className="flex justify-end mb-16">
              <div className="w-64">
                <div className="flex justify-between py-2 text-slate-600 border-b border-slate-100">
                  <span>Total HT</span>
                  <span>{totalHT.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-2 text-slate-600 border-b border-slate-100">
                  <span>TVA (20%)</span>
                  <span>{tva.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between py-3 text-xl font-bold text-slate-800">
                  <span>Total TTC</span>
                  <span className="text-indigo-600">{totalTTC.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Footer / Signature Area */}
            <div className="mt-auto border-t border-slate-200 pt-8 flex justify-between">
              <div className="w-1/2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Conditions & Paiement</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Acompte de 30% à la commande. Le solde est payable à réception de la facture.<br/>
                  Aucun escompte pour paiement anticipé. En cas de retard, des pénalités seront appliquées.
                </p>
              </div>
              <div className="w-1/3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Bon pour accord & Signature</p>
                <div className="h-24 border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                  <span className="text-slate-300 text-sm">Cachet / Signature Client</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
