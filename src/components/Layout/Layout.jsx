// src/components/Layout/Layout.jsx

import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

// 1. Importe a Barreira de Erros
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';

// 2. Importe o Toaster para as notificações
import { Toaster } from 'react-hot-toast';

// 3. Importe o novo Chat Flutuante
import ChatFlutuante from '../Chat/ChatFlutuante';

function Layout() {
  return (
    <div className="app-layout">
      {/* O Menu Lateral */}
      <Sidebar /> 

      {/* A Área de Conteúdo Principal */}
      <main className="content-area">
        
        {/* 4. O ErrorBoundary envolve o Outlet */}
        {/* Se qualquer página (Dashboard, Funcionarios, etc.) quebrar,
            isto irá capturar o erro e mostrar o ErrorFallback.
        */}
        <ErrorBoundary>
          <Outlet /> 
        </ErrorBoundary>

      </main>

      {/* 5. O Toaster (para notificações 'toast.success', 'toast.error') */}
      {/* Colocando aqui, ele fica disponível em todo o app */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 4000
        }}
      />
      
      {/* 6. O Chat Flutuante (o ícone fica no canto) */}
      <ChatFlutuante />
    </div>
  );
}

export default Layout;