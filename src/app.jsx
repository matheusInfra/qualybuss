import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import FuncionariosPage from './pages/FuncionariosPage';
import AusenciasPage from './pages/AusenciasPage';
import FeriasPage from './pages/FeriasPage';
import DocumentosPage from './pages/DocumentosPage';
import AjustesPage from './pages/AjustesPage'; // Importação Adicionada
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import MovimentacoesPage from './pages/MovimentacoesPage'; // Garantindo que todas as páginas existentes estejam aqui

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
            
            {/* Rotas Protegidas com Layout da Aplicação */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              {/* Redirecionamento padrão */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Módulos do Sistema */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/funcionarios" element={<FuncionariosPage />} />
              <Route path="/ausencias" element={<AusenciasPage />} />
              <Route path="/movimentacoes" element={<MovimentacoesPage />} />
              <Route path="/ferias" element={<FeriasPage />} />
              <Route path="/documentos" element={<DocumentosPage />} />
              
              {/* Módulo de Ajustes (Novo) */}
              <Route path="/ajustes" element={<AjustesPage />} />
              
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>

            {/* Rota de Fallback para 404 - Redireciona para dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

        </EmpresaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;