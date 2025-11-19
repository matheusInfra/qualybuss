import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css'; 

function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>MN Center</h3>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/funcionarios">Colaboradores</Link></li>
          <li><Link to="/ausencias">Ausências</Link></li>
          <li><Link to="/documentos">Documentos</Link></li>
          <li><Link to="/ferias">Férias</Link></li>
          <li><Link to="/movimentacoes">Movimentações</Link></li>
        </ul>
      </nav>

      {/* Área Inferior: Configurações e Logout */}
      <div className="sidebar-footer">
        {/* Link de Configurações movido para cá */}
        <Link to="/configuracoes" className="config-link">
          <span className="material-symbols-outlined">settings</span>
          Configurações
        </Link>
        
        <button onClick={handleLogout} className="logout-button">
          Sair
        </button>
      </div>
    </div>
  );
}

export default Sidebar;