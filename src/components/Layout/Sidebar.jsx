import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css'; // O CSS será atualizado no próximo passo para estilizar isso corretamente

function Sidebar() {
  const { signOut, user } = useAuth();

  // Definição dos itens do menu para facilitar manutenção
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/funcionarios', label: 'Funcionários', icon: '👥' },
    { path: '/ausencias', label: 'Ausências e Saldos', icon: '🕒' },
    { path: '/ferias', label: 'Gestão de Férias', icon: '🏖️' },
    { path: '/movimentacoes', label: 'Movimentações', icon: '📈' },
    { path: '/documentos', label: 'Documentos', icon: '📁' },
    { path: '/ajustes', label: 'Ajustes e Auditoria', icon: '🛠️' }, // Item novo adicionado
    { path: '/configuracoes', label: 'Configurações', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      {/* Cabeçalho da Sidebar */}
      <div className="sidebar-header">
        <h2 className="brand-logo">QualyBuss</h2>
        <p className="brand-subtitle">Gestão Inteligente</p>
      </div>

      {/* Navegação Principal */}
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rodapé da Sidebar (Logout e Info Usuário) */}
      <div className="sidebar-footer">
        {user && (
          <div className="user-info-mini">
            <small>Logado como:</small>
            <span className="user-email-truncate" title={user.email}>{user.email}</span>
          </div>
        )}
        <button onClick={signOut} className="btn-logout">
          <span className="nav-icon">🚪</span>
          <span className="nav-label">Sair do Sistema</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;