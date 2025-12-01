import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';
import ImportadorPage from './pages/ImportadorPage';
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

// Pages - Formulários e Detalhes (IMPORTANTE: Faltava importar o formulário)
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
                {/* 1. A Lista Geral */}
                <Route path="/funcionarios" element={<FuncionariosPage />} />
                
                {/* 2. Rota para CRIAR NOVO (Esta é a que estava faltando e causava o erro) */}
                <Route path="/funcionarios/novo" element={<FuncionarioForm />} />
                
                {/* 3. Rota para EDITAR (Recebendo o ID) */}
                <Route path="/funcionarios/editar/:id" element={<FuncionarioForm />} />

                {/* --- MÓDULO AUSÊNCIAS --- */}
                <Route path="/ausencias" element={<AusenciasPage />} />
                
                {/* --- MÓDULO MOVIMENTAÇÕES --- */}
                <Route path="/movimentacoes" element={<MovimentacoesPage />} />
                
                {/* --- MÓDULO FÉRIAS --- */}
                <Route path="/ferias" element={<FeriasPage />} />
                
                {/* --- MÓDULO DOCUMENTOS --- */}
                <Route path="/documentos" element={<DocumentosPage />} />
                <Route path="/documentos/:id" element={<DocumentoDetalhePage />} />
                <Route path="/importador" element={<ImportadorPage />} />
                {/* Outros Módulos */}
                <Route path="/ajustes" element={<AjustesPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                
              </Route>
            </Route>

            {/* Fallback: Se não achar a rota, manda pro Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

        </EmpresaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;