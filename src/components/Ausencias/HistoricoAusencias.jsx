import React from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast'; // Importa o toast
// Importa a NOVA função de download
import { getHistoricoAusencias, getAnexoAusenciaDownloadUrl } from '../../services/ausenciaService';
import { getFuncionarios, getAvatarPublicUrl } from '../../services/funcionarioService';
import './HistoricoAusencias.css'; // O CSS da tabela

// Helper para formatar a data
const formatarData = (dataStr) => {
  if (!dataStr) return 'N/A';
  const data = new Date(dataStr.replace(/-/g, '/'));
  return data.toLocaleDateString('pt-BR');
};

// Helper para as "pills" de tipo
const TipoPill = ({ tipo }) => {
  let className = 'tipo-pill';
  const tipoLowerCase = tipo.toLowerCase();
  if (tipoLowerCase.includes('férias')) className += ' ferias';
  else if (tipoLowerCase.includes('atestado')) className += ' atestado';
  else if (tipoLowerCase.includes('licença')) className += ' licenca';
  return <span className={className}>{tipo}</span>;
};


function HistoricoAusencias() {
  // --- A MÁGICA "ANTI-BUG" ---
  // BUSCA 1: O histórico (só com IDs)
  const { 
    data: ausencias, 
    error: errorAusencias, 
    isLoading: isLoadingAusencias 
  } = useSWR('getHistoricoAusencias', getHistoricoAusencias, {
    shouldRetryOnError: false // Para não fazer loop
  });

  // BUSCA 2: A lista de funcionários (do cache)
  const { 
    data: funcionarios, 
    error: errorFuncionarios, 
    isLoading: isLoadingFuncionarios 
  } = useSWR('getFuncionarios', getFuncionarios);
  // --- FIM DA MÁGICA ---

  // Adicione a função de Download
  // (Esta lógica é idêntica à do DocumentoLista.jsx)
  const handleDownload = async (pathStorage, nomeArquivo) => {
    toast.loading('Gerando link de download...');
    try {
      const url = await getAnexoAusenciaDownloadUrl(pathStorage);
      toast.dismiss();
      const link = document.createElement('a');
      link.href = url;
      // Define um nome padrão caso o nome original não esteja salvo
      link.setAttribute('download', nomeArquivo || 'anexo-ausencia'); 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.dismiss();
      toast.error(`Erro ao baixar: ${err.message}`);
    }
  };

  // Lida com os estados de Loading
  if (isLoadingAusencias || isLoadingFuncionarios) {
    return <p>Carregando histórico...</p>;
  }

  // Lida com os estados de Erro
  if (errorAusencias) {
    return <p className="error-message">Falha ao carregar o histórico: {errorAusencias.message}</p>;
  }
  if (errorFuncionarios) {
    return <p className="error-message">Falha ao carregar lista de funcionários: {errorFuncionarios.message}</p>;
  }

  // Lida com o estado "Vazio"
  if (ausencias.length === 0) {
    return (
      <div className="historico-empty">
        <p>Nenhum lançamento de ausência encontrado.</p>
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
            <th>Tipo</th>
            <th>Período</th>
            <th>Anexo</th>
          </tr>
        </thead>
        <tbody>
          {ausencias.map((ausencia) => {
            // Para cada ausência, encontramos o funcionário
            const funcionario = getFuncionarioInfo(ausencia.funcionario_id);
            
            return (
              <tr key={ausencia.id}>
                {/* Célula Colaborador (com Avatar) */}
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
                {/* Célula Tipo (com "Pill") */}
                <td>
                  <TipoPill tipo={ausencia.tipo} />
                </td>
                {/* Célula Período */}
                <td>
                  {formatarData(ausencia.data_inicio)} - {formatarData(ausencia.data_fim)}
                </td>
                {/* CÉLULA DE ANEXO ATUALIZADA */}
                <td>
                  {ausencia.anexo_path ? (
                    <button 
                      className="anexo-button" 
                      onClick={() => handleDownload(ausencia.anexo_path, 'anexo.pdf')}
                    >
                      <span className="material-symbols-outlined">attach_file</span>
                      Ver Anexo
                    </button>
                  ) : (
                    'N/A'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default HistoricoAusencias;