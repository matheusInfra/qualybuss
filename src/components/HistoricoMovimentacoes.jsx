// src/components/HistoricoMovimentacoes.jsx
// (VERSÃO SIMPLIFICADA - APENAS LEITURA - CORRIGIDA)

import React from 'react';
import useSWR from 'swr';
// 1. Importa o service novo/corrigido
import { getMovimentacoesPorFuncionario } from '../services/movimentacaoService';
import './HistoricoMovimentacoes.css';

// Helper para formatar data
const formatarData = (dataStr) => {
  if (!dataStr) return 'N/A';
  return new Date(dataStr.replace(/-/g, '/')).toLocaleDateString('pt-BR');
};

// Helper para formatar R$
const formatCurrency = (val) => val ? `R$ ${parseFloat(val).toFixed(2)}` : 'N/A';

function HistoricoMovimentacoes({ funcionarioId }) {
  // 1. Chave SWR única (usa 'funcionarioId' que vem do FuncionarioForm)
  const cacheKey = ['movimentacoes', funcionarioId];

  // 2. Busca o histórico (agora usando a função correta)
  const { 
    data: movimentacoes, 
    error, 
    isLoading 
  } = useSWR(cacheKey, () => getMovimentacoesPorFuncionario(funcionarioId));

  return (
    <div className="historico-wrapper">
      <div className="historico-lista-container">
        <h3 style={{marginTop: 0}}>Histórico de Movimentações</h3>
        
        {isLoading && <p>Carregando histórico...</p>}
        {error && <p className="error-message">Erro ao carregar histórico: {error.message}</p>}
        
        {!isLoading && !error && movimentacoes?.length === 0 && (
          <p>Nenhuma movimentação registrada para este colaborador.</p>
        )}
        
        <table className="historico-tabela">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Cargo (Antigo → Novo)</th>
              <th>Salário (Antigo → Novo)</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes && movimentacoes.map(mov => (
              <tr key={mov.id}>
                <td>{formatarData(mov.data_movimentacao)}</td>
                <td><span className="hist-tipo-pill">{mov.tipo}</span></td>
                <td>{mov.descricao}</td>
                {/* Coluna de Cargo */}
                <td>
                  {mov.cargo_anterior || mov.cargo_novo
                    ? `${mov.cargo_anterior || 'N/A'} → ${mov.cargo_novo || 'N/A'}`
                    : 'N/A'}
                </td>
                {/* Coluna de Salário */}
                <td>
                  {mov.salario_anterior || mov.salario_novo
                    ? `${formatCurrency(mov.salario_anterior)} → ${formatCurrency(mov.salario_novo)}`
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistoricoMovimentacoes;