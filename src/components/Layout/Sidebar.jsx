// src/components/Layout/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 
import { useEmpresa } from '../../contexts/EmpresaContext'; 
import './Layout.css'; // Reutilizando ou ajuste se tiver CSS separado

function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation();
  const { empresaSelecionada } = useEmpresa();
  
  // Função auxiliar para classe ativa
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">QualyBuss</div>
        {empresaSelecionada && (
            <div className="sidebar-empresa-badge">
                {empresaSelecionada.nome_fantasia}
            </div>
        )}
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-group-title">Visão Geral</div>
        <Link to="/" className={`nav-item ${isActive('/')}`}>
          <span className="material-symbols-outlined">dashboard</span>
          Dashboard
        </Link>
        
        <div className="nav-group-title">Operacional</div>
        <Link to="/funcionarios" className={`nav-item ${isActive('/funcionarios')}`}>
          <span className="material-symbols-outlined">groups</span>
          Colaboradores
        </Link>
        <Link to="/ferias" className={`nav-item ${isActive('/ferias')}`}>
          <span className="material-symbols-outlined">calendar_month</span>
          Gestão de Férias
        </Link>
        <Link to="/ausencias" className={`nav-item ${isActive('/ausencias')}`}>
          <span className="material-symbols-outlined">event_busy</span>
          Ausências e Saldos
        </Link>
        <Link to="/documentos" className={`nav-item ${isActive('/documentos')}`}>
          <span className="material-symbols-outlined">folder_open</span>
          Documentos
        </Link>

        {/* --- NOVO MÓDULO DE SEGURANÇA --- */}
        <div className="nav-group-title">Auditoria & Controle</div>
        <Link to="/ajustes" className={`nav-item ${isActive('/ajustes')}`}>
          <span className="material-symbols-outlined">gavel</span>
          Ajustes e Correções
        </Link>

        <div className="nav-group-title">Sistema</div>
        <Link to="/configuracoes" className={`nav-item ${isActive('/configuracoes')}`}>
          <span className="material-symbols-outlined">settings</span>
          Configurações
        </Link>
      </nav>
    </aside>
  );
}

export default Sidebar;