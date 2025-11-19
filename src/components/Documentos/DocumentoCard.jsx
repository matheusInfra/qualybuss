import React from 'react';
import { Link } from 'react-router-dom';
import { getAvatarPublicUrl } from '../../services/funcionarioService';
// 1. REUTILIZAMOS o CSS do card de funcionário
import '../FuncionarioCard.css'; 

function DocumentoCard({ funcionario }) {
  const avatarUrl = funcionario.avatar_url 
    ? getAvatarPublicUrl(funcionario.avatar_url) 
    : 'https://placehold.co/100';

  return (
    // 2. A MUDANÇA CRUCIAL: O link agora aponta para /documentos/id
    <Link to={`/documentos/${funcionario.id}`} className="card-link">
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

export default DocumentoCard;