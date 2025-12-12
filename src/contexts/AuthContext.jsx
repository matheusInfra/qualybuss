import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Busca sessão inicial com tratamento de erro
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(session);
      } catch (error) {
        console.error("Erro de sessão:", error.message);
        // Se o token for inválido/não encontrado, limpamos tudo forçadamente
        if (error.message.includes("Invalid Refresh Token") || error.message.includes("Not Found")) {
          await supabase.auth.signOut();
          setSession(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // 2. Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // console.log("Evento Auth:", event); // Descomente para debug

        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          setSession(null);
        } else if (event === 'TOKEN_REFRESH_REVOKED') {
          // Token revogado no servidor (ex: mudança de senha)
          console.warn("Token revogado! Deslogando...");
          await supabase.auth.signOut();
          setSession(null);
        } else {
          setSession(session);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user: session?.user || null,
    loading,
    
    signIn: (email, password) => 
      supabase.auth.signInWithPassword({ email, password }),
    
    signOut: () => supabase.auth.signOut(),

    resetPassword: (email) => 
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/atualizar-senha`, 
      }),

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