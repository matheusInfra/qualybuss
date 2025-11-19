import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Importante: verifique este caminho

function ProtectedRoute() {
  const { session, loading } = useAuth();

  // Se o AuthContext (nosso Wi-Fi) ainda está carregando, espere
  if (loading) {
    return <div>Carregando...</div>; 
  }

  // Se não estiver carregando E NÃO tiver sessão (usuário), 
  // mande para a tela de login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se passou em tudo, o usuário está logado.
  // <Outlet /> significa "pode renderizar a página que você ia renderizar"
  return <Outlet />;
}

export default ProtectedRoute; // MUITO IMPORTANTE: não esqueça esta linha