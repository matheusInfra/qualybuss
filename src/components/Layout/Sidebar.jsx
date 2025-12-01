import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css'; 

function Sidebar() {
  const { signOut, user } = useAuth();

  // Atualizado para usar Material Symbols em todos os itens para consistência visual
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/funcionarios', label: 'Funcionários', icon: 'group' },
    { path: '/ausencias', label: 'Ausências', icon: 'event_busy' },
    { path: '/ferias', label: 'Férias', icon: 'beach_access' },
    { path: '/movimentacoes', label: 'Movimentações', icon: 'trending_up' },
    { path: '/documentos', label: 'Documentos', icon: 'folder' },
    { path: '/importador', label: 'Importar Holerites', icon: 'cloud_upload' }, // Novo item
    { path: '/ajustes', label: 'Ajustes', icon: 'build' },
    { path: '/configuracoes', label: 'Configurações', icon: 'settings' },
  ];

  return (
    <aside className="sidebar">
      {/* Cabeçalho */}
      <div className="sidebar-header" style={{ padding: '24px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1a365d', fontWeight: 'bold' }}>QualyBuss</h2>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#718096' }}>Gestão Inteligente</p>
      </div>

      {/* Navegação */}
      <nav className="sidebar-nav" style={{ padding: '20px 0', flex: 1 }}>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink 
                to={item.path} 
                className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  color: isActive ? '#2563eb' : '#4a5568',
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  borderRight: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  fontWeight: isActive ? '600' : '400',
                  transition: 'all 0.2s'
                })}
              >
                {/* Ícone agora usa a classe correta do Material Symbols */}
                <span 
                  className="material-symbols-outlined" 
                  style={{ marginRight: '12px', fontSize: '1.3rem' }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Rodapé (Fixo na parte inferior) */}
      <div className="sidebar-footer" style={{ padding: '20px', borderTop: '1px solid #eee', backgroundColor: '#f9fafb' }}>
        {user && (
          <div style={{ marginBottom: '12px', fontSize: '0.85rem', color: '#4a5568' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Usuário Logado:</div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.email}>
              {user.email}
            </div>
          </div>
        )}
        <button 
          onClick={signOut} 
          style={{ 
            width: '100%', 
            padding: '10px', 
            border: '1px solid #fed7d7', 
            borderRadius: '6px',
            background: '#fff5f5',
            cursor: 'pointer',
            color: '#c53030',
            fontWeight: '600',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#feb2b2'}
          onMouseOut={(e) => e.currentTarget.style.background = '#fff5f5'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>logout</span>
          Sair do Sistema
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;