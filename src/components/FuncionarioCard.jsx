import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvatarPublicUrl } from '../services/funcionarioService';
import './FuncionarioCard.css';

const FuncionarioCard = ({ funcionario, onEdit }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    // CORREÇÃO: Verifica se existe uma função onEdit passada pelo pai, 
    // caso contrário navega para a rota correta de edição.
    if (onEdit) {
      onEdit();
    } else {
      // O erro estava aqui: faltava o segmento '/editar' na URL
      navigate(`/funcionarios/editar/${funcionario.id}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Ativo': return 'status-ativo';
      case 'Férias': return 'status-ferias';
      case 'Afastado': return 'status-afastado';
      case 'Desligado': return 'status-desligado';
      default: return '';
    }
  };

  // Resolve a URL da imagem com segurança
  const avatarUrl = funcionario.foto_url 
    ? getAvatarPublicUrl(funcionario.foto_url) 
    : null;

  return (
    <div className="funcionario-card" onClick={handleCardClick}>
      <div className="card-header-func">
        <div className={`status-badge ${getStatusColor(funcionario.status)}`}>
          {funcionario.status}
        </div>
        {funcionario.data_admissao && (
          <span className="tempo-casa">
            {new Date().getFullYear() - new Date(funcionario.data_admissao).getFullYear()} anos
          </span>
        )}
      </div>

      <div className="card-body-func">
        <div className="avatar-wrapper">
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={funcionario.nome_completo} 
              className="avatar-img"
              onError={(e) => {e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=USER'}}
            />
          ) : (
            <div className="avatar-placeholder">
              {funcionario.nome_completo ? funcionario.nome_completo.charAt(0) : '?'}
            </div>
          )}
        </div>
        
        <h3 className="func-nome" title={funcionario.nome_completo}>
          {funcionario.nome_completo}
        </h3>
        <p className="func-cargo">{funcionario.cargo || 'Cargo não informado'}</p>
        <p className="func-depto">{funcionario.departamento || 'Geral'}</p>
      </div>

      <div className="card-footer-func">
        <div className="info-mini">
          <span className="material-symbols-outlined">mail</span>
          <span className="text-truncate" title={funcionario.email_corporativo}>
            {funcionario.email_corporativo || '--'}
          </span>
        </div>
        <div className="info-mini">
          <span className="material-symbols-outlined">call</span>
          <span>{funcionario.telefone || '--'}</span>
        </div>
      </div>
    </div>
  );
};

export default FuncionarioCard;