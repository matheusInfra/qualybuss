import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient'; //
import { getAjustesPendentes, aprovarAjuste, rejeitarAjuste } from '../services/ausenciaService';
import { toast } from 'react-hot-toast';
import TimelineAuditoria from '../components/Auditoria/TimelineAuditoria'; // Novo componente de auditoria
import './AjustesPage.css'; //

function AjustesPage() {
  // Controle de Abas: 'ausencias' (Aprovações) ou 'auditoria' (Logs Globais)
  const [activeTab, setActiveTab] = useState('ausencias');
  
  const [ajustes, setAjustes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega solicitações de ajuste de ponto
  const loadAjustes = async () => {
    setLoading(true);
    try {
      const data = await getAjustesPendentes();
      setAjustes(data || []);
    } catch (error) {
      toast.error('Erro ao carregar ajustes.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega dados ao trocar para a aba de ausências
  useEffect(() => {
    if (activeTab === 'ausencias') {
      loadAjustes();
    }
  }, [activeTab]);

  // APROVAR AJUSTE DE PONTO
  const handleAprovar = async (id, novosDados, ausenciaId) => {
    try {
      await aprovarAjuste(id, novosDados, ausenciaId);
      toast.success('Ajuste aprovado e saldo atualizado!');
      loadAjustes(); 
    } catch (error) {
      toast.error('Erro ao aprovar: ' + error.message);
    }
  };

  // REJEITAR AJUSTE DE PONTO
  const handleRejeitar = async (id) => {
    const motivo = window.prompt("Motivo da rejeição (Obrigatório):");
    if (!motivo) return;

    try {
      await rejeitarAjuste(id, motivo);
      toast.success('Solicitação rejeitada.');
      loadAjustes(); 
    } catch (error) {
      toast.error('Erro ao rejeitar: ' + error.message);
    }
  };

  return (
    <div className="ajustes-container">
      <div className="ajustes-header">
        <h1>Central de Ajustes e Auditoria</h1>
        <p>Gerencie correções de ponto e monitore a segurança dos dados cadastrais.</p>
      </div>

      {/* NAVEGAÇÃO POR ABAS */}
      <div className="ajustes-tabs">
        <button 
          className={`tab-btn ${activeTab === 'ausencias' ? 'active' : ''}`}
          onClick={() => setActiveTab('ausencias')}
        >
          <span className="material-symbols-outlined">edit_calendar</span>
          Ajustes de Ponto
        </button>
        <button 
          className={`tab-btn ${activeTab === 'auditoria' ? 'active' : ''}`}
          onClick={() => setActiveTab('auditoria')}
        >
          <span className="material-symbols-outlined">visibility</span>
          Auditoria de Dados
        </button>
      </div>

      <div className="ajustes-content">
        
        {/* ABA 1: AJUSTES DE AUSÊNCIA (Operacional) */}
        {activeTab === 'ausencias' && (
          <div className="lista-ajustes fade-in">
            <div className="section-info">
               <h3>Solicitações Pendentes</h3>
               <p>Colaboradores solicitando alteração em datas ou tipos de ausência.</p>
            </div>
            
            {loading ? <p>Carregando solicitações...</p> : 
             ajustes.length === 0 ? (
                <div className="empty-state">
                  <span className="material-symbols-outlined">check_circle</span>
                  <p>Nenhuma pendência encontrada.</p>
                </div>
             ) : (
              <div className="cards-grid">
                {ajustes.map(ajuste => (
                  <div key={ajuste.id} className="ajuste-card">
                    <div className="card-header">
                      <span className="tipo-tag">{ajuste.tipo_ajuste}</span>
                      <span className="data-tag">{new Date(ajuste.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="card-body">
                      <p><strong>Colaborador:</strong> {ajuste.ausencia?.funcionarios?.nome_completo}</p>
                      <p className="justificativa">"{ajuste.justificativa}"</p>
                      
                      <div className="comparativo-visual">
                        <div className="bloco antigo">
                          <small>ORIGINAL</small>
                          <span>{ajuste.dados_anteriores.data_inicio ? new Date(ajuste.dados_anteriores.data_inicio).toLocaleDateString() : '-'}</span>
                          <span className="badge-mini">{ajuste.dados_anteriores.tipo}</span>
                        </div>
                        <span className="arrow">➝</span>
                        <div className="bloco novo">
                          <small>SOLICITADO</small>
                          <span>{ajuste.novos_dados.data_inicio ? new Date(ajuste.novos_dados.data_inicio).toLocaleDateString() : '-'}</span>
                          <span className="badge-mini">{ajuste.novos_dados.tipo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button className="btn-reject" onClick={() => handleRejeitar(ajuste.id)}>Rejeitar</button>
                      <button className="btn-approve" onClick={() => handleAprovar(ajuste.id, ajuste.novos_dados, ajuste.ausencia_id)}>Aprovar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: AUDITORIA GLOBAL (Segurança) */}
        {activeTab === 'auditoria' && (
          <div className="auditoria-global fade-in">
            <div className="auditoria-header-box">
              <h3>Monitoramento de Segurança</h3>
              <p>Histórico em tempo real de todas as alterações críticas realizadas no sistema (Salários, Cargos, Dados Pessoais).</p>
            </div>
            
            {/* Componente que lê a tabela logs_auditoria */}
            <TimelineAuditoria global={true} />
          </div>
        )}

      </div>
    </div>
  );
}

export default AjustesPage;