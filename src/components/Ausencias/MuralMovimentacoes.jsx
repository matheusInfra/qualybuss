import React from 'react';
import { getAvatarPublicUrl } from '../../services/funcionarioService'; // Reutilizando sua função de avatar
import './MuralMovimentacoes.css';

function MuralMovimentacoes({ movimentacoes = [] }) {
  
  // Função auxiliar para formatar datas (DD/MM/AAAA)
  const formatData = (dataString) => {
    if (!dataString) return '-';
    // Corrige problema de fuso horário ao criar data simples
    const date = new Date(dataString);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  // Função para calcular dias totais (opcional, mas útil)
  const calcularDias = (inicio, fim) => {
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia inicial
    return diffDays;
  };

  if (!movimentacoes || movimentacoes.length === 0) {
    return <div className="mural-empty">Nenhuma ausência programada ou registrada.</div>;
  }

  return (
    <div className="mural-grid">
      {movimentacoes.map((item) => (
        <div key={item.id} className="ausencia-card">
          
          {/* 1. Cabeçalho do Card: Avatar e Nome */}
          <div className="card-header">
            <img 
              src={item.funcionario?.avatar_url ? getAvatarPublicUrl(item.funcionario.avatar_url) : 'https://placehold.co/100'} 
              alt="Avatar" 
              className="card-avatar-small"
            />
            <div className="card-header-info">
              <h4 className="funcionario-nome">{item.funcionario?.nome_completo || 'Colaborador'}</h4>
              <span className="ausencia-tipo">{item.tipo || 'Ausência'}</span>
            </div>
          </div>

          {/* 2. Corpo do Card: Datas */}
          <div className="card-body">
            <div className="data-row">
              <span className="label">Início:</span>
              <span className="value">{formatData(item.data_inicio)}</span>
            </div>
            <div className="data-row">
              <span className="label">Fim:</span>
              <span className="value">{formatData(item.data_fim)}</span>
            </div>
            <div className="data-badge">
              {calcularDias(item.data_inicio, item.data_fim)} dias
            </div>
          </div>

          {/* 3. Rodapé com Ícone de Informação (Tooltip) */}
          <div className="card-footer">
            <div className={`status-badge status-${(item.status || 'pendente').toLowerCase()}`}>
              {item.status || 'Pendente'}
            </div>

            {/* A MÁGICA DO TOOLTIP ACONTECE AQUI */}
            <div className="tooltip-container">
              <span className="info-icon">ℹ️</span>
              
              {/* Esta div só aparece ao passar o mouse */}
              <div className="tooltip-content">
                <strong>Justificativa/Observação:</strong>
                <p>{item.observacao || item.motivo || "Nenhuma observação informada."}</p>
              </div>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}

export default MuralMovimentacoes;