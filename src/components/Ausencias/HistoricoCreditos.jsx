import React from 'react';
import useSWR from 'swr';
// 1. Importa as funções de busca necessárias
import { getHistoricoCreditos } from '../../services/ausenciaService';
import { getFuncionarios, getAvatarPublicUrl } from '../../services/funcionarioService';
// 2. REUTILIZA o CSS da outra tabela
import './HistoricoAusencias.css'; 

// Helper para formatar a data
const formatarData = (dataStr) => {
  if (!dataStr) return 'N/A';
  const data = new Date(dataStr.replace(/-/g, '/'));
  return data.toLocaleDateString('pt-BR');
};

// Helper para as "pills" de tipo de CRÉDITO
const TipoCreditoPill = ({ tipo }) => {
  let className = 'tipo-pill';
  const tipoLowerCase = tipo.toLowerCase();

  if (tipoLowerCase.includes('férias')) {
    className += ' credito-ferias';
  } else if (tipoLowerCase.includes('banco de horas')) {
    className += ' credito-banco';
  } else if (tipoLowerCase.includes('sindicato')) {
    className += ' credito-sindicato';
  }
  return <span className={className}>{tipo}</span>;
};

function HistoricoCreditos() {
  // --- Lógica "Anti-Bug" ---
  // BUSCA 1: O histórico de créditos (só com IDs)
  const { 
    data: creditos, 
    error: errorCreditos, 
    isLoading: isLoadingCreditos 
  } = useSWR('getHistoricoCreditos', getHistoricoCreditos, {
    shouldRetryOnError: false
  });

  // BUSCA 2: A lista de funcionários (do cache)
  const { 
    data: funcionarios, 
    error: errorFuncionarios, 
    isLoading: isLoadingFuncionarios 
  } = useSWR('getFuncionarios', getFuncionarios);
  // --- Fim da Lógica ---

  // Lida com os estados de Loading
  if (isLoadingCreditos || isLoadingFuncionarios) {
    return <p>Carregando histórico de créditos...</p>;
  }

  // Lida com os estados de Erro
  if (errorCreditos) {
    return <p className="error-message">Falha ao carregar o histórico: {errorCreditos.message}</p>;
  }
  if (errorFuncionarios) {
    return <p className="error-message">Falha ao carregar lista de funcionários: {errorFuncionarios.message}</p>;
  }

  // Lida com o estado "Vazio"
  if (creditos.length === 0) {
    return (
      <div className="historico-empty">
        <p>Nenhum lançamento de crédito encontrado.</p>
      </div>
    );
  }

  // Função para "JUNTAR" (fazer o JOIN) aqui no React
  const getFuncionarioInfo = (id) => {
    const func = funcionarios?.find(f => f.id === id);
    if (!func) {
      return { nome: '(Desconhecido)', avatar_url: null };
    }
    return func;
  };

  // Renderiza a tabela
  return (
    <div className="historico-container">
      <table className="historico-table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Data Lanç.</th>
            <th>Tipo</th>
            <th>Quantidade</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {creditos.map((credito) => {
            const funcionario = getFuncionarioInfo(credito.funcionario_id);
            
            return (
              <tr key={credito.id}>
                {/* Célula Colaborador */}
                <td>
                  <div className="colaborador-cell">
                    <img
                      src={
                        funcionario.avatar_url
                          ? getAvatarPublicUrl(funcionario.avatar_url)
                          : 'https://placehold.co/100'
                      }
                      alt={funcionario.nome}
                      className="colaborador-avatar"
                    />
                    <span className="colaborador-nome">
                      {funcionario.nome}
                    </span>
                  </div>
                </td>
                {/* Célula Data */}
                <td>
                  {formatarData(credito.data_lancamento)}
                </td>
                {/* Célula Tipo */}
                <td>
                  <TipoCreditoPill tipo={credito.tipo} />
                </td>
                {/* Célula Quantidade */}
                <td>
                  <strong style={{color: '#28a745'}}>
                    + {credito.quantidade} {credito.unidade}
                  </strong>
                </td>
                {/* Célula Motivo */}
                <td>
                  {credito.motivo || 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default HistoricoCreditos;