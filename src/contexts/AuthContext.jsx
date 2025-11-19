import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient'; 

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // O 'authListener' aqui é o objeto que contém a assinatura
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // 3. Limpa o "ouvinte" quando o componente é desmontado
    return () => {
      // A CORREÇÃO ESTÁ AQUI:
      // Acessamos a propriedade .subscription para cancelar
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user || null,
    loading,
    signIn: (email, password) => 
      supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}