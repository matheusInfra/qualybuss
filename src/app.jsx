import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FuncionariosPage from './pages/FuncionariosPage';
import AusenciasPage from './pages/AusenciasPage';
import FeriasPage from './pages/FeriasPage';
import DocumentosPage from './pages/DocumentosPage';
import AjustesPage from './pages/AjustesPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import MovimentacoesPage from './pages/MovimentacoesPage';
import SalariosPage from './pages/SalariosPage';
import ImportadorPage from './pages/ImportadorPage'; // Restaurado para Funcionários
import FuncionarioForm from './pages/FuncionarioForm';
import DocumentoDetalhePage from './pages/DocumentoDetalhePage';

import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <EmpresaProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* Gestão de Pessoas */}
                <Route path="/funcionarios" element={<FuncionariosPage />} />
                <Route path="/funcionarios/novo" element={<FuncionarioForm />} />
                <Route path="/funcionarios/editar/:id" element={<FuncionarioForm />} />
                
                {/* Financeiro (Novo Módulo Standalone) */}
                <Route path="/salarios" element={<SalariosPage />} />

                {/* RH Operacional */}
                <Route path="/ausencias" element={<AusenciasPage />} />
                <Route path="/movimentacoes" element={<MovimentacoesPage />} />
                <Route path="/ferias" element={<FeriasPage />} />
                <Route path="/documentos" element={<DocumentosPage />} />
                <Route path="/documentos/:id" element={<DocumentoDetalhePage />} />
                
                {/* Ferramentas */}
                <Route path="/importador" element={<ImportadorPage />} />
                <Route path="/ajustes" element={<AjustesPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </EmpresaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;