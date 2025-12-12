// src/components/Layout/Layout.jsx

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

// 1. Importe a Barreira de Erros
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';

// 3. Importe o novo Chat Flutuante
import ChatFlutuante from '../Chat/ChatFlutuante';
// 4. Importe o NotificationBell
import NotificationBell from './NotificationBell';

function Layout() {
  // Estado para controlar se o sidebar está recolhido ou não
  // false = aberto (padrão), true = recolhido
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`app-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* O Menu Lateral recebe o estado e a função de toggle */}
      <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />

      {/* A Área de Conteúdo Principal */}
      <main className="content-area">

        {/* Notificações no Topo Direito */}
        <div className="top-bar-notifications">
          <NotificationBell />
        </div>

        {/* 4. O ErrorBoundary envolve o Outlet */}
        {/* Se qualquer página (Dashboard, Funcionarios, etc.) quebrar,
            isto irá capturar o erro e mostrar o ErrorFallback.
        */}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* 5. O Toaster (para notificações 'toast.success', 'toast.error') */}
      {/* Removido daqui pois já existe no App.jsx */}

      {/* 6. O Chat Flutuante (o ícone fica no canto) */}
      <ChatFlutuante />
    </div>
  );
}

export default Layout;