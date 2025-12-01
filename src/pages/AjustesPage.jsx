import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { supabase } from '../services/supabaseClient';
import ModalSolicitarAjuste from '../components/Modal/ModalSolicitarAjuste';
import ModalConfirmacao from '../components/Modal/ModalConfirmacao'; 
import { toast } from 'react-hot-toast';
import { getAjustesPendentes, aprovarAjuste, rejeitarAjuste } from '../services/ausenciaService';
import './AjustesPage.css';

function AjustesPage() {
  const [activeTab, setActiveTab] = useState('pendentes'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [registroParaAjuste, setRegistroParaAjuste] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate } = useSWRConfig();

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, ajuste: null, action: null });

  const { data: ajustesPendentes, isLoading: loadingPendentes } = useSWR('getAjustesPendentes', getAjustesPendentes);
  
  const { data: registrosAprovados } = useSWR('registros_aprovados', async () => {
     const { data } = await supabase.from('solicitacoes_ausencia')
        .select(`*, funcionarios(nome_completo, cargo)`)
        .eq('status', 'Aprovado')
        .order('created_at', { ascending: false }).limit(50);
     return data;
  });

  const { data: auditoria } = useSWR('auditoria_recente', async () => {
    const { data } = await supabase.from('auditoria_ajustes').select('*').order('created_at', { ascending: false }).limit(20);
    return data;
  });

  const handleActionClick = (ajuste, action) => {
    setConfirmModal({ isOpen: true, ajuste, action });
  };

  const handleConfirmarAcao = async () => {
    const { ajuste, action } = confirmModal;
    setConfirmModal({ ...confirmModal, isOpen: false });

    try {
      if (action === 'Aprovar') {
        await aprovarAjuste(ajuste.id, ajuste.novos_dados, ajuste.ausencia_id);
        toast.success("Ajuste aplicado e auditado!");
      } else {
        await rejeitarAjuste(ajuste.id, "Rejeitado pelo gestor");
        toast.success("Solicitação rejeitada.");
      }
      mutate('getAjustesPendentes');
      mutate('auditoria_recente');
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
  };

  const filtroRegistros = registrosAprovados?.filter(r => 
    r.funcionarios?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ajustes-container">
      <header className="ajustes-header">
        <h1>Central de Retificação</h1>
        <p>Controle de divergências e auditoria fiscal.</p>
      </header>

      <div className="ajustes-tabs">
        <button className={activeTab === 'pendentes' ? 'active' : ''} onClick={() => setActiveTab('pendentes')}>
          Inbox de Divergências
          {ajustesPendentes?.length > 0 && <span className="badge-count">{ajustesPendentes.length}</span>}
        </button>
        <button className={activeTab === 'novo' ? 'active' : ''} onClick={() => setActiveTab('novo')}>
          Realizar Ajuste
        </button>
        <button className={activeTab === 'auditoria' ? 'active' : ''} onClick={() => setActiveTab('auditoria')}>
          Log de Auditoria
        </button>
      </div>

      <div className="ajustes-content">
        {activeTab === 'pendentes' && (
          <div className="tab-pane">
            {loadingPendentes && <div className="loading-spinner">Carregando...</div>}
            
            {!loadingPendentes && ajustesPendentes?.length === 0 && (
              <div className="empty-state-ajustes">
                <span className="material-symbols-outlined">verified</span>
                <h3>Nenhuma divergência pendente.</h3>
              </div>
            )}
            
            <div className="cards-ajustes-grid">
              {ajustesPendentes?.map(ajuste => (
                <div key={ajuste.id} className="card-ajuste">
                  <div className="ajuste-top">
                    <span className="ajuste-tipo-tag">{ajuste.tipo_ajuste}</span>
                    <span className="ajuste-data">{new Date(ajuste.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="ajuste-user">
                    <strong>{ajuste.ausencia?.funcionarios?.nome_completo}</strong>
                  </div>
                  
                  <div className="ajuste-diff">
                    <div className="diff-col old">
                      <label>Como está (Errado)</label>
                      <div className="diff-val">
                        {new Date(ajuste.dados_anteriores.data_inicio).toLocaleDateString()} - {ajuste.dados_anteriores.tipo}
                      </div>
                    </div>
                    <div className="diff-icon">➜</div>
                    <div className="diff-col new">
                      <label>Como deve ficar</label>
                      <div className="diff-val">
                        {new Date(ajuste.novos_dados.data_inicio).toLocaleDateString()} - {ajuste.novos_dados.tipo}
                      </div>
                    </div>
                  </div>

                  <p className="ajuste-justificativa">"{ajuste.justificativa}"</p>

                  <div className="ajuste-footer">
                    <button className="btn-ajuste-reject" onClick={() => handleActionClick(ajuste, 'Rejeitar')}>Rejeitar</button>
                    <button className="btn-ajuste-approve" onClick={() => handleActionClick(ajuste, 'Aprovar')}>Aprovar Correção</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'novo' && (
          <div className="tab-pane">
            <div className="search-bar-ajustes">
              <span className="material-symbols-outlined">search</span>
              <input 
                placeholder="Buscar lançamento consolidado para corrigir..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="lista-registros-clean">
              {filtroRegistros?.map(reg => (
                <div key={reg.id} className="registro-item">
                  <div className="reg-info">
                    <h4>{reg.funcionarios?.nome_completo}</h4>
                    <span>{reg.tipo} • {new Date(reg.data_inicio).toLocaleDateString()} a {new Date(reg.data_fim).toLocaleDateString()}</span>
                  </div>
                  <button className="btn-solicitar-ajuste" onClick={() => { setRegistroParaAjuste(reg); setIsModalOpen(true); }}>
                    Corrigir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'auditoria' && (
          <div className="tab-pane">
            <div className="table-wrapper">
              <table className="table-auditoria">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Ação</th>
                    <th>Detalhes Fiscais</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoria?.map(log => (
                    <tr key={log.id}>
                      <td className="col-data">{new Date(log.created_at).toLocaleString()}</td>
                      <td><span className="badge-audit">{log.tipo_acao}</span></td>
                      <td className="col-desc">{log.justificativa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && registroParaAjuste && (
        <ModalSolicitarAjuste 
          ausencia={registroParaAjuste}
          onClose={() => { setIsModalOpen(false); setRegistroParaAjuste(null); }}
          onSuccess={() => { toast.success("Enviado para análise."); setActiveTab('pendentes'); mutate('getAjustesPendentes'); }}
        />
      )}

      <ModalConfirmacao 
        isOpen={confirmModal.isOpen}
        title={confirmModal.action === 'Aprovar' ? "Confirmar Retificação" : "Rejeitar Correção"}
        message={confirmModal.action === 'Aprovar' 
          ? "Essa ação alterará permanentemente o registro original e gerará um log de auditoria. O saldo será recalculado." 
          : "A solicitação será descartada e o registro original permanecerá inalterado."}
        confirmLabel={confirmModal.action === 'Aprovar' ? "Processar Ajuste" : "Rejeitar"}
        variant={confirmModal.action === 'Aprovar' ? 'warning' : 'danger'}
        onConfirm={handleConfirmarAcao}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}

export default AjustesPage;