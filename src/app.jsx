import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ErrorFallback from './components/ErrorBoundary/ErrorFallback';

// CSS
import './App.css';

// --- LAZY LOADING ---
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SelecaoEmpresaPage = lazy(() => import('./pages/SelecaoEmpresaPage'));
const FuncionariosPage = lazy(() => import('./pages/FuncionariosPage'));
const FuncionarioForm = lazy(() => import('./pages/FuncionarioForm'));
const SalariosPage = lazy(() => import('./pages/SalariosPage'));
const AusenciasPage = lazy(() => import('./pages/AusenciasPage'));
const FeriasPage = lazy(() => import('./pages/FeriasPage'));
const DocumentosPage = lazy(() => import('./pages/DocumentosPage'));
const DocumentoDetalhePage = lazy(() => import('./pages/DocumentoDetalhePage'));
const MovimentacoesPage = lazy(() => import('./pages/MovimentacoesPage'));
const ImportadorPage = lazy(() => import('./pages/ImportadorPage'));
const AjustesPage = lazy(() => import('./pages/AjustesPage'));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'));
const AtualizarSenhaPage = lazy(() => import('./pages/AtualizarSenhaPage'));

// Loading Component
const LoadingScreen = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b' }}>
    <div className="spinner" style={{ marginRight: '10px' }}></div> Carregando...
  </div>
);

function App() {
  return (
    <Router>
      <ErrorBoundary fallback={<ErrorFallback />}>
        <AuthProvider>
          <EmpresaProvider>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
            
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                {/* Rota Pública */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/atualizar-senha" element={<AtualizarSenhaPage />} />

                {/* Rotas Protegidas */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/selecao-empresa" element={<SelecaoEmpresaPage />} />
                  
                  <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Gestão de Pessoas - ROTAS DE EDIÇÃO */}
                    <Route path="/funcionarios" element={<FuncionariosPage />} />
                    <Route path="/funcionarios/novo" element={<FuncionarioForm />} />
                    {/* Esta é a rota que o card deve chamar: */}
                    <Route path="/funcionarios/editar/:id" element={<FuncionarioForm />} />

                    <Route path="/salarios" element={<SalariosPage />} />
                    <Route path="/ausencias" element={<AusenciasPage />} />
                    <Route path="/ferias" element={<FeriasPage />} />
                    <Route path="/movimentacoes" element={<MovimentacoesPage />} />
                    <Route path="/documentos" element={<DocumentosPage />} />
                    <Route path="/documentos/:id" element={<DocumentoDetalhePage />} />
                    <Route path="/importador" element={<ImportadorPage />} />
                    <Route path="/ajustes" element={<AjustesPage />} />
                    <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </EmpresaProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;