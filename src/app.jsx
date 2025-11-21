import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';

// Layouts e Componentes de Proteção
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ErrorFallback from './components/ErrorBoundary/ErrorFallback';

// Páginas (Lazy Loading para performance)
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

// --- DEFINIÇÃO DAS ROTAS ---
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
    // Primeiro nível de proteção: Usuário deve estar LOGADO
    element: (
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ProtectedRoute />
      </ErrorBoundary>
    ),
    children: [
      {
        path: "/",
        // ESTRATÉGIA SINGLE-TENANT:
        // Removemos o <RequireEmpresa>. O usuário logado acessa direto o Layout.
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
      <EmpresaProvider>
        <RouterProvider router={router} />
      </EmpresaProvider>
    </AuthProvider>
  );
}

export default App;