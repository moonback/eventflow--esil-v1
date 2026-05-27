import { User, Bell, Database, Shield, Smartphone, Globe, LogOut, Check, Upload, Camera } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../db/supabase';

export function Settings() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user || !supabase) return;
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        avatar_url: avatarUrl
      });
      
      if (!error) {
        setSaved(true);
        // Sync context profile if needed (though context listens to session not profiles, wait, we do a fetchProfile in context manually. A reload might be needed to reflect on layout, or we can just window.location.reload())
        setTimeout(() => {
          setSaved(false);
          window.location.reload();
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setSaving(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Vous devez sélectionner une image à uploader.');
      }
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      if (!supabase) return;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const tabs = [
    { id: 'account', label: 'Compte & Profil', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'offline', label: 'Stockage & Hors-ligne', icon: Database },
    { id: 'security', label: 'Sécurité & Accès', icon: Shield },
    { id: 'devices', label: 'Appareils Connectés', icon: Smartphone },
    { id: 'preferences', label: 'Préférences', icon: Globe },
  ];

  return (
    <div className="p-4 md:p-8 flex-1 flex flex-col md:flex-row gap-8 overflow-hidden pb-24 md:pb-8">
      {/* Settings Navigation */}
      <div className="w-full md:w-64 shrink-0">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 mb-6">
          Paramètres
        </h1>
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-blue-600" : "text-slate-400")} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 max-w-3xl overflow-y-auto">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 md:p-8">
          
          {activeTab === 'account' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Profil Utilisateur</h2>
                <p className="text-sm text-slate-500">Mettez à jour vos informations personnelles.</p>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-xl font-bold text-slate-500 border-4 border-white shadow-sm uppercase overflow-hidden relative group">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <>{firstName?.charAt(0) || ''}{lastName?.charAt(0) || ''}</>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Changer l'avatar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prénom</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nom</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email</label>
                  <input type="email" value={user?.email || ''} disabled className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rôle</label>
                  <input type="text" value={profile?.role || ''} disabled className="w-full px-3 py-2 border border-slate-200 uppercase rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                <button 
                  onClick={handleSignOut}
                  className="px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Se déconnecter
                </button>
                <div className="flex gap-3 items-center">
                  {saved && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="w-4 h-4" /> Sauvegardé</span>}
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offline' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">Stratégie Hors-ligne</h2>
                <p className="text-sm text-slate-500">Gérez le cache local et la synchronisation Supabase.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-4">
                <Database className="w-6 h-6 text-blue-500 mt-1" />
                <div>
                  <h3 className="font-semibold text-slate-800">Base locale IndexedDB (Dexie)</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Les données sont stockées localement sur cet appareil pour permettre l'utilisation sans réseau.
                    La synchronisation avec le cloud (Supabase) s'effectue automatiquement au retour du réseau.
                  </p>
                  <div className="mt-4 flex gap-3 text-sm">
                    <button className="font-medium text-blue-600 hover:underline">Forcer la synchro</button>
                    <span className="text-slate-300">•</span>
                    <button className="font-medium text-red-600 hover:underline">Vider le cache local</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {['notifications', 'security', 'devices', 'preferences'].includes(activeTab) && (
            <div className="py-12 text-center animate-in fade-in">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-800">Module en construction</h3>
              <p className="text-sm text-slate-500 mt-1">Ces paramètres seront disponibles prochainement.</p>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}
