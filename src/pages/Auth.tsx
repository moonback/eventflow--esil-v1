import React, { useState } from 'react';
import { supabase } from '../db/supabase';
import { Mail, Lock, User, Briefcase, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('technician');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!supabase) {
      setError("La connexion à Supabase n'est pas configurée dans l'environnement.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              role: role
            }
          }
        });
        if (error) throw error;
        setSuccessMsg("Inscription réussie. Vérifiez votre boîte mail si nécessaire.");
      }
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-blue-500/30">
              E
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isLogin ? 'Bon retour !' : 'Créer un compte'}
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              {isLogin ? 'Connectez-vous pour accéder à EventFlow' : 'Rejoignez les équipes sur le terrain'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-6 flex items-start gap-2 border border-red-100">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-6 border border-green-100">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Prénom</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-transparent bg-slate-50 focus:bg-white" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-transparent bg-slate-50 focus:bg-white" 
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-transparent bg-slate-50 focus:bg-white" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-transparent bg-slate-50 focus:bg-white" 
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all focus:border-transparent bg-slate-50 focus:bg-white appearance-none" 
                  >
                    <option value="technician">Technicien</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="driver">Chauffeur</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E293B] hover:bg-slate-800 text-white rounded-lg py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-md uppercase tracking-wider mt-4 disabled:opacity-70 transition-colors"
            >
              {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer mon compte')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <div className="px-8 py-5 bg-slate-50 text-center border-t border-slate-100">
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
