import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getSolicitacoesPendentes, decidirSolicitacao } from '../../services/ausenciaService';
import ModalConfirmacao from '../Modal/ModalConfirmacao'; // Requer o componente ModalConfirmacao
import './AprovacaoPendencias.css'; 

function AprovacaoPendencias() {
  const { data: pendencias, isLoading } = useSWR('getSolicitacoesPendentes', getSolicitacoesPendentes);
  const { mutate } = useSWRConfig();
  const [processando, setProcessando] = useState(null);
  
  // Estado para controlar o modal de confirmação
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, item: null, action: null });

  const abrirConfirmacao = (item, action) => {
    setConfirmModal({ isOpen: true, item, action });
  };

  const handleConfirmarAcao = async () => {
    const { item, action } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false }); 
    setProcessando(item.id);

    try {
      // (Opcional) Logica de motivo de rejeição poderia entrar aqui via prompt ou modal específico
      let motivo = '';
      if (action === 'Rejeitado') {
         // motivo = prompt("Motivo opcional:");
      }

      await decidirSolicitacao(item.id, action, motivo);
      toast.success(action === 'Aprovado' ? "Solicitação Aprovada!" : "Solicitação Rejeitada.");
      
      mutate('getSolicitacoesPendentes');
      mutate('getMuralRecente'); 
    } catch (error) {
      toast.error("Erro: " + error.message);
    } finally {
      setProcessando(null);
    }
  };

  if (isLoading) return <div className="loading-container"><div className="spinner"></div> Carregando pendências...</div>;

  if (!pendencias || pendencias.length === 0) {
    return (
      <div className="empty-state-aprovacao">
        <span className="material-symbols-outlined icon-empty">check_circle</span>
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
              <span className={`tag-tipo ${item.tipo === 'Férias' ? 'ferias' : 'outros'}`}>
                {item.tipo === 'Férias' && '🏖️ '}
                {item.tipo.includes('Atestado') && '🤒 '}
                {item.tipo}
              </span>
              <span className="pendencia-data">Criado em {new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="pendencia-user">
              {item.funcionarios?.avatar_url ? (
                  <img src={item.funcionarios.avatar_url} alt="" className="avatar-small" />
              ) : (
                  <div className="avatar-placeholder">{item.funcionarios?.nome_completo?.charAt(0)}</div>
              )}
              <div className="user-details">
                <strong>{item.funcionarios?.nome_completo}</strong>
                <small>{item.funcionarios?.cargo || 'Colaborador'}</small>
              </div>
            </div>

            <div className="pendencia-detalhes">
              <div className="data-block">
                <span className="label">Início</span>
                <span className="value">{new Date(item.data_inicio).toLocaleDateString()}</span>
              </div>
              <div className="data-arrow">
                <span className="material-symbols-outlined">arrow_right_alt</span>
              </div>
              <div className="data-block">
                <span className="label">Fim</span>
                <span className="value">{new Date(item.data_fim).toLocaleDateString()}</span>
              </div>
              <div className="dias-badge">
                {item.quantidade} dias
              </div>
            </div>

            {item.motivo && (
              <div className="pendencia-motivo">
                <span className="label">Motivo:</span>
                <p>"{item.motivo}"</p>
              </div>
            )}

            {item.anexo_path && (
               <div className="pendencia-anexo">
                 <span className="material-symbols-outlined">attach_file</span>
                 <small>Documento Anexado</small>
               </div>
            )}

            <div className="pendencia-actions">
              <button 
                className="btn-reject" 
                onClick={() => abrirConfirmacao(item, 'Rejeitado')}
                disabled={!!processando}
              >
                Rejeitar
              </button>
              <button 
                className="btn-approve" 
                onClick={() => abrirConfirmacao(item, 'Aprovado')}
                disabled={!!processando}
              >
                {processando === item.id ? '...' : 'Aprovar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <ModalConfirmacao 
        isOpen={confirmModal.isOpen}
        title={confirmModal.action === 'Aprovado' ? "Aprovar Solicitação?" : "Rejeitar Solicitação?"}
        message={
          confirmModal.action === 'Aprovado' && confirmModal.item?.tipo === 'Férias'
            ? `ATENÇÃO: Isso descontará automaticamente ${confirmModal.item.quantidade} dias do saldo de férias do colaborador. Deseja continuar?`
            : "Tem certeza que deseja processar esta ação?"
        }
        confirmLabel={confirmModal.action === 'Aprovado' ? "Sim, Aprovar" : "Sim, Rejeitar"}
        variant={confirmModal.action === 'Aprovado' ? 'primary' : 'danger'}
        onConfirm={handleConfirmarAcao}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}

export default AprovacaoPendencias;