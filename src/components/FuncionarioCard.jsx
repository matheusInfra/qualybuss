import React from 'react';
import { Link } from 'react-router-dom';
import { getAvatarPublicUrl } from '../services/funcionarioService';
import './FuncionarioCard.css';

function FuncionarioCard({ funcionario }) {
  const avatarUrl = funcionario.avatar_url 
    ? getAvatarPublicUrl(funcionario.avatar_url) 
    : 'https://placehold.co/100';

  return (
    // CORREÇÃO: O Link deve apontar para /funcionarios/editar/ID
    // Isso deve bater exatamente com <Route path="/funcionarios/editar/:id" ... /> do App.jsx
    <Link to={`/funcionarios/editar/${funcionario.id}`} className="card-link">
      <div className="funcionario-card">
        <img src={avatarUrl} alt={funcionario.nome_completo} className="card-avatar" />
        <div className="card-info">
          <h3 className="card-nome">{funcionario.nome_completo}</h3>
          <p className="card-cargo">{funcionario.cargo || 'Cargo não definido'}</p>
        </div>
      </div>
    </Link>
  );
}

export default FuncionarioCard;