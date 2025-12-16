import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages - Listagens
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FuncionariosPage from './pages/FuncionariosPage';
import AusenciasPage from './pages/AusenciasPage';
import FeriasPage from './pages/FeriasPage';
import DocumentosPage from './pages/DocumentosPage';
import AjustesPage from './pages/AjustesPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import MovimentacoesPage from './pages/MovimentacoesPage';
// import ImportadorPage from './pages/ImportadorPage'; // REMOVIDO
// import PontoPage from './pages/PontoPage'; // REMOVIDO
import SalariosPage from './pages/SalariosPage';

// Pages - Formulários e Detalhes
import FuncionarioForm from './pages/FuncionarioForm';
import DocumentoDetalhePage from './pages/DocumentoDetalhePage';

// CSS
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <EmpresaProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

          <Routes>
            {/* Rota Pública */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rotas Protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>

                {/* Redirecionamento da raiz */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* Dashboard */}
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* --- MÓDULO FUNCIONÁRIOS --- */}
                <Route path="/funcionarios" element={<FuncionariosPage />} />
                <Route path="/funcionarios/novo" element={<FuncionarioForm />} />
                <Route path="/funcionarios/editar/:id" element={<FuncionarioForm />} />

                {/* --- MÓDULOS DE RH --- */}
                <Route path="/ausencias" element={<AusenciasPage />} />
                <Route path="/movimentacoes" element={<MovimentacoesPage />} />
                <Route path="/ferias" element={<FeriasPage />} />
                <Route path="/documentos" element={<DocumentosPage />} />
                <Route path="/documentos/:id" element={<DocumentoDetalhePage />} />

                {/* --- NOVOS MÓDULOS (Salários Mantido) --- */}
                {/* <Route path="/ponto" element={<PontoPage />} /> REMOVIDO */}
                <Route path="/salarios" element={<SalariosPage />} />

                {/* --- FERRAMENTAS --- */}
                {/* <Route path="/importador" element={<ImportadorPage />} /> REMOVIDO */}
                <Route path="/ajustes" element={<AjustesPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />

              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

        </EmpresaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;