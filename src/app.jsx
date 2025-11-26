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

// Pages - Formulários e Detalhes
// Certifique-se que o caminho do import está correto
import FuncionarioForm from './pages/FuncionarioForm';
import DocumentoDetalhePage from './pages/DocumentoDetalhePage';

// CSS Resetado
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
                
                {/* Redireciona raiz para dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route path="/dashboard" element={<DashboardPage />} />
                
                {/* --- MÓDULO FUNCIONÁRIOS (Correção Aqui) --- */}
                {/* 1. Lista de Funcionários */}
                <Route path="/funcionarios" element={<FuncionariosPage />} />
                
                {/* 2. Formulário de Novo Cadastro (Esta é a rota que faltava/falhava) */}
                <Route path="/funcionarios/novo" element={<FuncionarioForm />} />
                
                {/* 3. Formulário de Edição (Recebe o ID) */}
                <Route path="/funcionarios/editar/:id" element={<FuncionarioForm />} />

                {/* --- OUTROS MÓDULOS --- */}
                <Route path="/ausencias" element={<AusenciasPage />} />
                <Route path="/movimentacoes" element={<MovimentacoesPage />} />
                <Route path="/ferias" element={<FeriasPage />} />
                
                {/* --- MÓDULO DOCUMENTOS --- */}
                <Route path="/documentos" element={<DocumentosPage />} />
                <Route path="/documentos/:id" element={<DocumentoDetalhePage />} />
                
                <Route path="/ajustes" element={<AjustesPage />} />
                <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                
              </Route>
            </Route>

            {/* Rota de Erro 404 - Volta para o dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

        </EmpresaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;