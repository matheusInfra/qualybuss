import React from 'react';
import useSWR from 'swr';
import { getAniversariantesMes } from '../../services/dashboardService';
import './AniversariantesCard.css';

function AniversariantesCard() {
  const { data: aniversariantes, error, isLoading } = useSWR('getAniversariantesMes', () => getAniversariantesMes(null)); 
  // Nota: Passando função arrow para garantir que parametros (empresaId) possam ser injetados se necessário no futuro

  // Formata o nome para não ficar muito longo (Primeiro e Último)
  const formatNome = (nome) => {
    if (!nome) return 'Colaborador';
    const partes = nome.split(' ');
    if (partes.length > 1) return `${partes[0]} ${partes[partes.length - 1]}`;
    return partes[0];
  };

  // Helper seguro para obter o dia, lidando com fusos horários se a data vier completa
  const getDiaExibicao = (func) => {
    if (func.dia_aniversario) return func.dia_aniversario; // Se já veio processado do serviço
    if (func.data_nascimento) return func.data_nascimento.split('-')[2];
    return '--';
  };

  if (isLoading) return (
    <div className="dashboard-card aniversariantes-card loading-state">
       <div className="spinner-simple"></div>
       <span>Carregando festas... 🎉</span>
    </div>
  );
  
  if (error) return (
    <div className="dashboard-card aniversariantes-card error-state">
      <span className="material-symbols-outlined">error</span>
      <p>Não foi possível carregar os aniversariantes.</p>
    </div>
  );

  return (
    <div className="dashboard-card aniversariantes-card">
      <div className="card-header">
        <div className="header-title">
            <h3>🎉 Aniversariantes</h3>
            <span className="subtitle-mes">
                {new Date().toLocaleString('pt-BR', { month: 'long' })}
            </span>
        </div>
        <span className="badge-count">{aniversariantes?.length || 0}</span>
      </div>

      <div className="lista-aniversariantes">
        {aniversariantes?.length === 0 ? (
          <div className="empty-state">
            <span className="emoji-sad">🎈</span>
            <p>Nenhum aniversário este mês.</p>
          </div>
        ) : (
          aniversariantes.map((func) => (
            <div key={func.id} className="item-aniversariante fade-in">
              <div className="avatar-wrapper">
                {func.avatar_url ? (
                  <img src={func.avatar_url} alt={func.nome_completo} />
                ) : (
                  <div className="avatar-placeholder" style={{backgroundColor: '#e2e8f0', color: '#64748b'}}>
                    {func.nome_completo ? func.nome_completo.charAt(0) : '?'}
                  </div>
                )}
              </div>
              
              <div className="info-aniversariante">
                <span className="nome" title={func.nome_completo}>{formatNome(func.nome_completo)}</span>
                <span className="cargo">{func.cargo || 'Colaborador'}</span>
              </div>

              <div className="data-badge">
                <span className="dia">{getDiaExibicao(func)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AniversariantesCard;