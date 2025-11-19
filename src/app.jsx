import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider, useEmpresa } from './contexts/EmpresaContext';

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
const SelecaoEmpresaPage = React.lazy(() => import('./pages/SelecaoEmpresaPage'));

// --- COMPONENTE DE GUARDA DE EMPRESA ---
// Verifica se o usuário já selecionou uma loja para trabalhar.
function RequireEmpresa({ children }) {
  const { empresaAtual, loadingEmpresa, minhasEmpresas } = useEmpresa();

  // 1. Mostra loading enquanto verifica o vínculo
  if (loadingEmpresa) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#f7fafc', 
        color: '#4a5568' 
      }}>
        Verificando acessos...
      </div>
    );
  }

  // 2. Se não tem empresa selecionada, mas tem empresas vinculadas: Mostra Seleção
  if (!empresaAtual && minhasEmpresas.length > 0) {
    return (
      <Suspense fallback={<div>Carregando seleção...</div>}>
        <SelecaoEmpresaPage />
      </Suspense>
    );
  }

  // 3. Caso de borda: Usuário sem nenhuma empresa vinculada
  if (!empresaAtual && minhasEmpresas.length === 0) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '20px', 
        textAlign: 'center' 
      }}>
        <h2>Acesso Pendente</h2>
        <p style={{ color: '#718096', maxWidth: '400px' }}>
          Seu usuário foi criado, mas ainda não está vinculado a nenhuma loja ou empresa. 
          Entre em contato com o administrador do sistema.
        </p>
      </div>
    );
  }

  // 4. Tudo certo (Empresa selecionada): Renderiza o app normal
  return children;
}

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
        // Segundo nível de proteção: Usuário deve ter EMPRESA SELECIONADA
        // Se não tiver, o RequireEmpresa mostra a tela de seleção em vez do Layout
        element: (
          <RequireEmpresa>
            <Layout />
          </RequireEmpresa>
        ),
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
      {/* O EmpresaProvider deve ficar DENTRO do AuthProvider, pois depende do 'user' */}
      <EmpresaProvider>
        <RouterProvider router={router} />
      </EmpresaProvider>
    </AuthProvider>
  );
}

export default App;