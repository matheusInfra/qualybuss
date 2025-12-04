import React from 'react';
import useSWR from 'swr';
import { getMovimentacoesPorFuncionario } from '../services/movimentacaoService'; //
import './HistoricoMovimentacoes.css'; //

// Helper para formatar data
const formatarData = (dataStr) => {
  if (!dataStr) return '-';
  // Ajuste para evitar problemas de fuso horário simples
  return new Date(dataStr.replace(/-/g, '/')).toLocaleDateString('pt-BR');
};

// Helper para formatar R$
const formatCurrency = (val) => {
  if (!val) return '-';
  return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function HistoricoMovimentacoes({ funcionarioId }) {
  const cacheKey = ['movimentacoes', funcionarioId];

  const { 
    data: movimentacoes, 
    error, 
    isLoading 
  } = useSWR(cacheKey, () => getMovimentacoesPorFuncionario(funcionarioId));

  // Função Inteligente: Decide o que mostrar baseado no tipo
  const renderDetalhes = (mov) => {
    // Lista de mudanças para renderizar
    const mudancas = [];

    // 1. Mudança de Cargo
    if (mov.cargo_novo && mov.cargo_anterior !== mov.cargo_novo) {
      mudancas.push(
        <div key="cargo" className="detalhe-item">
          <span className="detalhe-label">Cargo:</span>
          <span className="detalhe-valor">
            {mov.cargo_anterior || 'S/ Cargo'} <span className="arrow">➝</span> <strong>{mov.cargo_novo}</strong>
          </span>
        </div>
      );
    }

    // 2. Mudança de Salário
    if (mov.salario_novo && Number(mov.salario_anterior) !== Number(mov.salario_novo)) {
      mudancas.push(
        <div key="salario" className="detalhe-item">
          <span className="detalhe-label">Salário:</span>
          <span className="detalhe-valor">
            {formatCurrency(mov.salario_anterior)} <span className="arrow">➝</span> <strong>{formatCurrency(mov.salario_novo)}</strong>
          </span>
        </div>
      );
    }

    // 3. Mudança de Departamento
    if (mov.departamento_novo && mov.departamento_anterior !== mov.departamento_novo) {
      mudancas.push(
        <div key="depto" className="detalhe-item">
          <span className="detalhe-label">Depto:</span>
          <span className="detalhe-valor">
            {mov.departamento_anterior || '-'} <span className="arrow">➝</span> <strong>{mov.departamento_novo}</strong>
          </span>
        </div>
      );
    }

    // 4. Mudança de Empresa
    if (mov.empresa_nova && mov.empresa_anterior !== mov.empresa_nova) {
      mudancas.push(
        <div key="empresa" className="detalhe-item">
          <span className="detalhe-label">Empresa:</span>
          <span className="detalhe-valor">
            <span className="tag-transfer">Transferência entre unidades</span>
          </span>
        </div>
      );
    }

    // Fallback se nada específico for detectado (apenas exibe a descrição)
    if (mudancas.length === 0) {
      return <span className="text-muted">-</span>;
    }

    return <div className="detalhes-lista">{mudancas}</div>;
  };

  return (
    <div className="historico-wrapper">
      <div className="historico-lista-container">
        {/* Header removido para ficar limpo dentro do form, ou pode manter se quiser */}
        
        {isLoading && <div className="loading-state">Carregando histórico...</div>}
        {error && <div className="error-message">Erro ao carregar histórico.</div>}
        
        {!isLoading && !error && movimentacoes?.length === 0 && (
          <div className="empty-state">
            <span className="material-symbols-outlined">history</span>
            <p>Nenhuma movimentação registrada.</p>
          </div>
        )}
        
        {!isLoading && movimentacoes?.length > 0 && (
          <table className="historico-tabela">
            <thead>
              <tr>
                <th style={{width: '100px'}}>Data</th>
                <th style={{width: '120px'}}>Tipo</th>
                <th style={{width: '30%'}}>Motivo / Descrição</th>
                <th>Detalhes da Alteração</th> {/* Coluna Dinâmica Unificada */}
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map(mov => (
                <tr key={mov.id}>
                  <td className="data-cell">{formatarData(mov.data_movimentacao)}</td>
                  <td>
                    <span className={`hist-tipo-pill ${mov.tipo === 'Desligamento' ? 'danger' : ''} ${mov.tipo === 'Promoção' ? 'success' : ''}`}>
                      {mov.tipo}
                    </span>
                  </td>
                  <td className="desc-cell">{mov.descricao}</td>
                  <td className="detalhes-cell">
                    {renderDetalhes(mov)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default HistoricoMovimentacoes;