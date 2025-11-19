import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // 1. Importe o hook
import './Layout.css'; 

function Sidebar() {
  const { signOut } = useAuth(); // 2. Pegue a função signOut
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login'); // 3. Redirecione para o login após sair
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
          <li><Link to="/ausencias">Ausencia</Link></li>
          <li><Link to="/documentos">Documentos</Link></li>
          <li><Link to="/ferias">Férias</Link></li>
          <li><Link to="/movimentacoes">Movimentações</Link></li>
        </ul>
      </nav>

      {/* Botão de Sair na parte inferior */}
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-button">
          Sair
        </button>
      </div>
    </div>
  );
}

export default Sidebar;