import React from 'react';
import useSWR from 'swr';
import { getAniversariantesMes } from '../../services/dashboardService';
import './AniversariantesCard.css'; // Sugestão de criar CSS básico ou usar inline

function AniversariantesCard() {
  const { data: aniversariantes, error, isLoading } = useSWR('getAniversariantesMes', getAniversariantesMes);

  // Formata o nome para não ficar muito longo (Primeiro e Último)
  const formatNome = (nome) => {
    const partes = nome.split(' ');
    if (partes.length > 1) return `${partes[0]} ${partes[partes.length - 1]}`;
    return partes[0];
  };

  if (isLoading) return <div className="card-loading">Carregando festas... 🎉</div>;
  if (error) return <div className="card-error">Erro ao carregar aniversários.</div>;

  return (
    <div className="dashboard-card aniversariantes-card">
      <div className="card-header">
        <h3>🎉 Aniversariantes do Mês</h3>
        <span className="badge-count">{aniversariantes?.length || 0}</span>
      </div>

      <div className="lista-aniversariantes">
        {aniversariantes?.length === 0 ? (
          <p className="empty-state">Nenhum aniversário este mês.</p>
        ) : (
          aniversariantes.map((func) => (
            <div key={func.id} className="item-aniversariante">
              <div className="avatar-wrapper">
                {func.avatar_url ? (
                  <img src={func.avatar_url} alt={func.nome_completo} />
                ) : (
                  <div className="avatar-placeholder">
                    {func.nome_completo.charAt(0)}
                  </div>
                )}
              </div>
              
              <div className="info-aniversariante">
                <span className="nome">{formatNome(func.nome_completo)}</span>
                <span className="cargo">{func.cargo}</span>
              </div>

              <div className="data-badge">
                <span className="dia">{func.dia_aniversario}</span>
                <span className="mes-abrev">
                   {new Date().toLocaleString('pt-BR', { month: 'short' }).replace('.','')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AniversariantesCard;