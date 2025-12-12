import React from 'react';
import { Link } from 'react-router-dom';
import { getAvatarPublicUrl } from '../../services/funcionarioService';
// 1. REUTILIZAMOS o CSS do card de funcionário
import '../FuncionarioCard.css';

function DocumentoCard({ funcionario }) {
  const avatarUrl = funcionario.avatar_url
    ? getAvatarPublicUrl(funcionario.avatar_url)
    : 'https://placehold.co/100';

  // Lógica LGPD / Desligamento
  const isInativo = funcionario.status === 'Inativo';

  // Cálculo de Expurgo (Simulado: 5 anos após desligamento ou atualização)
  // Como não temos a data exata de desligamento no objeto simples, usamos o ano atual + 5 como referência visual
  const anoExpurgo = new Date().getFullYear() + 5;

  return (
    // 2. A MUDANÇA CRUCIAL: O link agora aponta para /documentos/id
    <Link to={`/documentos/${funcionario.id}`} className="card-link">
      <div className={`funcionario-card ${isInativo ? 'inativo' : ''}`}>
        <img src={avatarUrl} alt={funcionario.nome_completo} className="card-avatar" />
        <div className="card-info">
          <h3 className="card-nome">{funcionario.nome_completo}</h3>
          <p className="card-cargo">{funcionario.cargo || 'Cargo não definido'}</p>

          {isInativo && (
            <div className="lgpd-badge" title={`Manter documentos até ${anoExpurgo} (Legal)`}>
              LGPD: Retenção Legal
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default DocumentoCard;