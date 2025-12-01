import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { supabase } from '../services/supabaseClient';
import ModalSolicitarAjuste from '../components/Modal/ModalSolicitarAjuste';
import { toast } from 'react-hot-toast';
import { getAjustesPendentes, aprovarAjuste, rejeitarAjuste } from '../services/ausenciaService';
import './AjustesPage.css';

function AjustesPage() {
  const [activeTab, setActiveTab] = useState('pendentes'); // 'pendentes', 'novo', 'auditoria'
  const [searchTerm, setSearchTerm] = useState('');
  const [registroParaAjuste, setRegistroParaAjuste] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { mutate } = useSWRConfig();

  // 1. Inbox: Ajustes Pendentes
  const { data: ajustesPendentes, isLoading: loadingPendentes } = useSWR('getAjustesPendentes', getAjustesPendentes);

  // 2. Novo Ajuste: Busca Registros Aprovados
  const { data: registrosAprovados } = useSWR('registros_aprovados', async () => {
     const { data } = await supabase
        .from('solicitacoes_ausencia')
        .select(`*, funcionarios(nome_completo, cargo)`)
        .eq('status', 'Aprovado')
        .order('created_at', { ascending: false })
        .limit(50);
     return data;
  });

  // 3. Histórico: Auditoria
  const { data: auditoria } = useSWR('auditoria_recente', async () => {
    const { data } = await supabase
      .from('auditoria_ajustes') 
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    return data;
  });

  const handleAprovar = async (ajuste) => {
    if (!window.confirm("Confirma a alteração dos dados originais?")) return;
    try {
      await aprovarAjuste(ajuste.id, ajuste.novos_dados, ajuste.ausencia_id);
      toast.success("Ajuste aplicado com sucesso!");
      mutate('getAjustesPendentes');
      mutate('auditoria_recente');
    } catch (e) {
      toast.error("Erro ao aprovar: " + e.message);
    }
  };

  const handleRejeitar = async (id) => {
    const motivo = prompt("Motivo da rejeição:");
    if (!motivo) return;
    try {
      await rejeitarAjuste(id, motivo);
      toast.success("Solicitação rejeitada.");
      mutate('getAjustesPendentes');
    } catch (e) {
      toast.error("Erro ao rejeitar: " + e.message);
    }
  };

  const filtroRegistros = registrosAprovados?.filter(r => 
    r.funcionarios?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ajustes-container">
      <header className="ajustes-header">
        <h1>Central de Controle de Ajustes</h1>
        <p>Gerencie retificações, correções de ponto e auditoria fiscal.</p>
      </header>

      <div className="ajustes-tabs">
        <button 
          className={activeTab === 'pendentes' ? 'active' : ''} 
          onClick={() => setActiveTab('pendentes')}
        >
          Inbox de Aprovação 
          {ajustesPendentes?.length > 0 && <span className="badge-count">{ajustesPendentes.length}</span>}
        </button>
        <button 
          className={activeTab === 'novo' ? 'active' : ''} 
          onClick={() => setActiveTab('novo')}
        >
          Nova Solicitação
        </button>
        <button 
          className={activeTab === 'auditoria' ? 'active' : ''} 
          onClick={() => setActiveTab('auditoria')}
        >
          Auditoria & Logs
        </button>
      </div>

      <div className="ajustes-content">
        
        {/* --- TAB: PENDENTES (INBOX) --- */}
        {activeTab === 'pendentes' && (
          <div className="tab-pane">
            {loadingPendentes && <p>Carregando solicitações...</p>}
            {!loadingPendentes && ajustesPendentes?.length === 0 && (
              <div className="empty-state">
                <span>✅</span>
                <p>Tudo limpo! Nenhuma solicitação de ajuste pendente.</p>
              </div>
            )}
            
            <div className="cards-pendentes-grid">
              {ajustesPendentes?.map(ajuste => (
                <div key={ajuste.id} className="card-ajuste-pendente">
                  <div className="ajuste-header">
                    <span className="tipo-tag">{ajuste.tipo_ajuste}</span>
                    <span className="data-tag">{new Date(ajuste.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <h4>{ajuste.ausencia?.funcionarios?.nome_completo}</h4>
                  <p className="justificativa">"{ajuste.justificativa}"</p>
                  
                  <div className="diff-comparison">
                    <div className="diff-old">
                      <small>Original:</small>
                      <div>{new Date(ajuste.dados_anteriores.data_inicio).toLocaleDateString()}</div>
                    </div>
                    <div className="diff-arrow">➝</div>
                    <div className="diff-new">
                      <small>Proposto:</small>
                      <div>{new Date(ajuste.novos_dados.data_inicio).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="ajuste-actions">
                    <button className="btn-reject" onClick={() => handleRejeitar(ajuste.id)}>Rejeitar</button>
                    <button className="btn-approve" onClick={() => handleAprovar(ajuste)}>Aprovar Alteração</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: NOVO AJUSTE --- */}
        {activeTab === 'novo' && (
          <div className="tab-pane">
            <div className="search-bar-ajustes">
              <input 
                placeholder="Buscar colaborador para retificar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="lista-registros-simples">
              {filtroRegistros?.map(reg => (
                <div key={reg.id} className="row-registro">
                  <div className="info">
                    <strong>{reg.funcionarios?.nome_completo}</strong>
                    <span>{reg.tipo} ({new Date(reg.data_inicio).toLocaleDateString()} - {new Date(reg.data_fim).toLocaleDateString()})</span>
                  </div>
                  <button onClick={() => { setRegistroParaAjuste(reg); setIsModalOpen(true); }}>
                    Solicitar Correção
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- TAB: AUDITORIA --- */}
        {activeTab === 'auditoria' && (
          <div className="tab-pane">
            <table className="table-auditoria">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Ação</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                {auditoria?.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td><span className="badge-audit">{log.tipo_acao}</span></td>
                    <td>{log.justificativa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && registroParaAjuste && (
        <ModalSolicitarAjuste 
          ausencia={registroParaAjuste}
          onClose={() => { setIsModalOpen(false); setRegistroParaAjuste(null); }}
          onSuccess={() => { 
            toast.success("Solicitação enviada para o Inbox."); 
            setActiveTab('pendentes'); 
            mutate('getAjustesPendentes');
          }}
        />
      )}
    </div>
  );
}

export default AjustesPage;