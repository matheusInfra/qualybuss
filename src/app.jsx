// src/app.jsx
import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';

import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ErrorFallback from './components/ErrorBoundary/ErrorFallback';

// Páginas
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const FuncionariosPage = React.lazy(() => import('./pages/FuncionariosPage'));
const FuncionarioForm = React.lazy(() => import('./pages/FuncionarioForm'));
const AusenciasPage = React.lazy(() => import('./pages/AusenciasPage'));
const FeriasPage = React.lazy(() => import('./pages/FeriasPage'));
const DocumentosPage = React.lazy(() => import('./pages/DocumentosPage'));
const DocumentoDetalhePage = React.lazy(() => import('./pages/DocumentoDetalhePage'));
const MovimentacoesPage = React.lazy(() => import('./pages/MovimentacoesPage'));
const ConfiguracoesPage = React.lazy(() => import('./pages/ConfiguracoesPage'));
[cite_start]// Removemos SelecaoEmpresaPage [cite: 11]

const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <Suspense fallback={<div className="loading">Carregando...</div>}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: "/",
    // A única proteção é estar LOGADO (Auth)
    element: (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ProtectedRoute />
      </ErrorBoundary>
    ),
    children: [
      {
        path: "/",
        // REMOVIDO: <RequireEmpresa>
        // Agora o Layout carrega direto
        element: <Layout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<div className="loading">Carregando Dashboard...</div>}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "funcionarios",
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={<div className="loading">Carregando Colaboradores...</div>}>
                    <FuncionariosPage />
                  </Suspense>
                ),
              },
              {
                path: "novo",
                element: (
                  <Suspense fallback={<div className="loading">Carregando Formulário...</div>}>
                    <FuncionarioForm />
                  </Suspense>
                ),
              },
              {
                path: ":id",
                element: (
                  <Suspense fallback={<div className="loading">Carregando Ficha...</div>}>
                    <FuncionarioForm />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: "ausencias",
            element: (
              <Suspense fallback={<div className="loading">Carregando Ausências...</div>}>
                <AusenciasPage />
              </Suspense>
            ),
          },
          {
            path: "ferias",
            element: (
              <Suspense fallback={<div className="loading">Carregando Férias...</div>}>
                <FeriasPage />
              </Suspense>
            ),
          },
          {
            path: "documentos",
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={<div className="loading">Carregando Documentos...</div>}>
                    <DocumentosPage />
                  </Suspense>
                ),
              },
              {
                path: ":id",
                element: (
                  <Suspense fallback={<div className="loading">Carregando Detalhes...</div>}>
                    <DocumentoDetalhePage />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: "movimentacoes",
            element: (
              <Suspense fallback={<div className="loading">Carregando Histórico...</div>}>
                <MovimentacoesPage />
              </Suspense>
            ),
          },
          {
            path: "configuracoes",
            element: (
              <Suspense fallback={<div className="loading">Carregando Configurações...</div>}>
                <ConfiguracoesPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <AuthProvider>
      {/* Mantemos o Provider para ter acesso aos dados da empresa se necessário, 
          mas ele não bloqueará mais a navegação */}
      <EmpresaProvider>
        <RouterProvider router={router} />
      </EmpresaProvider>
    </AuthProvider>
  );
}

export default App;