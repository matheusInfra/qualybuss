import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getSolicitacoesPendentes, decidirSolicitacao } from '../../services/ausenciaService';
import './AprovacaoPendencias.css'; 

function AprovacaoPendencias() {
  const { data: pendencias, isLoading } = useSWR('getSolicitacoesPendentes', getSolicitacoesPendentes);
  const { mutate } = useSWRConfig();
  const [processando, setProcessando] = useState(null);

  const handleDecisao = async (item, decisao) => {
    // Confirmação para desconto de saldo
    if (decisao === 'Aprovado' && item.tipo === 'Férias') {
      if (!window.confirm(`ATENÇÃO: Aprovar esta solicitação descontará automaticamente ${item.quantidade} dias do saldo de férias. Confirmar?`)) {
        return;
      }
    }

    if (decisao === 'Rejeitado') {
      const motivo = prompt("Motivo da rejeição (opcional):");
      if (motivo === null) return;
    }

    setProcessando(item.id);
    try {
      await decidirSolicitacao(item.id, decisao);
      toast.success(`Solicitação ${decisao.toLowerCase()} com sucesso!`);
      mutate('getSolicitacoesPendentes');
      mutate('getMuralRecente'); 
    } catch (error) {
      toast.error("Erro: " + error.message);
    } finally {
      setProcessando(null);
    }
  };

  if (isLoading) return <div className="loading-state">Carregando pendências...</div>;

  if (!pendencias || pendencias.length === 0) {
    return (
      <div className="empty-state-aprovacao">
        <span style={{fontSize: '3rem'}}>🎉</span>
        <h3>Tudo limpo!</h3>
        <p>Você zerou a fila de aprovações.</p>
      </div>
    );
  }

  return (
    <div className="aprovacao-container">
      <div className="pendencias-grid">
        {pendencias.map((item) => (
          <div key={item.id} className="pendencia-card">
            <div className="pendencia-header">
              <span className={`tag-tipo ${item.tipo === 'Férias' ? 'ferias' : 'outros'}`}>{item.tipo}</span>
              <span className="pendencia-data">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="pendencia-user">
              {item.funcionarios?.avatar_url ? (
                  <img src={item.funcionarios.avatar_url} alt="" className="avatar-small" />
              ) : (
                  <div className="avatar-placeholder">{item.funcionarios?.nome_completo?.charAt(0)}</div>
              )}
              <div>
                <strong>{item.funcionarios?.nome_completo}</strong>
                <small>{item.funcionarios?.cargo}</small>
              </div>
            </div>

            <div className="pendencia-detalhes">
              <div className="data-range">
                <span>{new Date(item.data_inicio).toLocaleDateString()}</span>
                <span className="arrow">➜</span>
                <span>{new Date(item.data_fim).toLocaleDateString()}</span>
              </div>
              <div className="dias-count">
                {item.quantidade} dias
              </div>
            </div>

            {item.motivo && <p className="pendencia-motivo">"{item.motivo}"</p>}

            <div className="pendencia-actions">
              <button 
                className="btn-reject" 
                onClick={() => handleDecisao(item, 'Rejeitado')}
                disabled={!!processando}
              >
                Rejeitar
              </button>
              <button 
                className="btn-approve" 
                onClick={() => handleDecisao(item, 'Aprovado')}
                disabled={!!processando}
              >
                {processando === item.id ? 'Processando...' : 'Aprovar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AprovacaoPendencias;