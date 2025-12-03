import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient'; //

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Verifica sessão atual ao montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuta mudanças na autenticação (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // 3. Limpeza correta da subscrição
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user || null,
    loading,
    
    // Login com Senha
    signIn: (email, password) => 
      supabase.auth.signInWithPassword({ email, password }),
    
    // Logout
    signOut: () => supabase.auth.signOut(),

    // [NOVO] Solicitar Link de Recuperação
    // O redirectTo é crucial no Self-Hosted para o usuário voltar para a página certa
    resetPassword: (email) => 
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/atualizar-senha`, 
      }),

    // [NOVO] Atualizar a senha (usado quando o usuário já clicou no link do email)
    updatePassword: (newPassword) => 
      supabase.auth.updateUser({ password: newPassword })
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