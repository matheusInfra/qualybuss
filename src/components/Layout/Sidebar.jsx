import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

function Sidebar({ isCollapsed, toggleSidebar }) {
  const { signOut, user } = useAuth();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/funcionarios', label: 'Colaboradores', icon: 'group' },
    { path: '/salarios', label: 'Gestão de Folha', icon: 'attach_money' }, // Novo Destaque
    { path: '/ausencias', label: 'Ausências', icon: 'event_busy' },
    { path: '/ferias', label: 'Férias', icon: 'beach_access' },
    { path: '/movimentacoes', label: 'Movimentações', icon: 'trending_up' },
    { path: '/documentos', label: 'Documentos', icon: 'folder' },
    { path: '/importador', label: 'Importações', icon: 'cloud_upload' },
    { path: '/ajustes', label: 'Ajustes', icon: 'build' },
    { path: '/configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-container">
          <div className="logo-icon">Q</div>
          {!isCollapsed && (
            <div className="brand-text">
              <h2>QualyBuss</h2>
              <p>Gestão Inteligente</p>
            </div>
          )}
        </div>
        <button className="toggle-btn" onClick={toggleSidebar}>
          <span className="material-symbols-outlined">{isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title={isCollapsed ? item.label : ''}>
                <span className="material-symbols-outlined nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && user && (
          <div className="user-info-mini">
            <div className="user-avatar">{user.email.charAt(0).toUpperCase()}</div>
            <div className="user-details"><span className="user-name">Usuário</span></div>
          </div>
        )}
        <button onClick={signOut} className="btn-logout"><span className="material-symbols-outlined">logout</span></button>
      </div>
    </aside>
  );
}

export default Sidebar;