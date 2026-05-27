import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../db/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null, profile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentUser: User) => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      
      if (!error && data) {
        setProfile(data);
      } else if (!data) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            id: currentUser.id, 
            email: currentUser.email || '',
            first_name: currentUser.user_metadata?.first_name || '',
            last_name: currentUser.user_metadata?.last_name || '',
            role: currentUser.user_metadata?.role || 'technician'
          })
          .select()
          .single();
          
        if (!insertError && newProfile) {
          setProfile(newProfile);
        }
      }
    } catch (err) {
      console.error("Error fetching profile", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
