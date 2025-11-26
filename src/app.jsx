import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages - Importações Principais
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FuncionariosPage from './pages/FuncionariosPage';
import AusenciasPage from './pages/AusenciasPage';
import FeriasPage from './pages/FeriasPage';
import DocumentosPage from './pages/DocumentosPage';
import AjustesPage from './pages/AjustesPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import MovimentacoesPage from './pages/MovimentacoesPage';

// Pages - Importações de Detalhes/Formulários (ESSENCIAIS PARA NÃO CAIR NO DASHBOARD)
import FuncionarioForm from './pages/FuncionarioForm';       // Rota de Edição/Criação
import DocumentoDetalhePage from './pages/DocumentoDetalhePage'; // Rota de Detalhe

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
                
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* --- MÓDULO FUNCIONÁRIOS --- */}
                <Route path="/funcionarios" element={<FuncionariosPage />} />
                {/* As rotas abaixo corrigem o erro de cair no dashboard ao clicar em 'Novo' ou 'Editar' */}
                <Route path="/funcionarios/novo" element={<FuncionarioForm />} />
                <Route path="/funcionarios/editar/:id" element={<FuncionarioForm />} />

                {/* --- MÓDULO AUSÊNCIAS --- */}
                <Route path="/ausencias" element={<AusenciasPage />} />
                
                {/* --- MÓDULO MOVIMENTAÇÕES --- */}
                <Route path="/movimentacoes" element={<MovimentacoesPage />} />
                
                {/* --- MÓDULO FÉRIAS --- */}
                <Route path="/ferias" element={<FeriasPage />} />
                
                {/* --- MÓDULO DOCUMENTOS --- */}
                <Route path="/documentos" element={<DocumentosPage />} />
                {/* A rota abaixo corrige o erro de cair no dashboard ao clicar em um documento */}
                <Route path="/documentos/:id" element={<DocumentoDetalhePage />} />
                
                <Route path="/ajustes" element={<AjustesPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                
              </Route>
            </Route>

            {/* Fallback - Redireciona qualquer rota desconhecida para o Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

        </EmpresaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;