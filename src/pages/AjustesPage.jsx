import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { getAjustesPendentes, aprovarAjuste, rejeitarAjuste } from '../services/ausenciaService';
import { toast } from 'react-hot-toast';
import TimelineAuditoria from '../components/Auditoria/TimelineAuditoria'; // [NOVO]
import './AjustesPage.css';

function AjustesPage() {
  const [activeTab, setActiveTab] = useState('ausencias'); // 'ausencias' ou 'auditoria'
  const [ajustes, setAjustes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega Ajustes de Ausência (Lógica existente)
  const loadAjustes = async () => {
    try {
      const data = await getAjustesPendentes();
      setAjustes(data || []);
    } catch (error) {
      toast.error('Erro ao carregar ajustes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ausencias') loadAjustes();
  }, [activeTab]);

  // Handlers de Aprovação (Lógica existente)
  const handleAprovar = async (id, novosDados, ausenciaId) => {
    try {
      await aprovarAjuste(id, novosDados, ausenciaId);
      toast.success('Ajuste aprovado!');
      loadAjustes();
    } catch (error) {
      toast.error('Erro ao aprovar: ' + error.message);
    }
  };

  const handleRejeitar = async (id) => {
    const motivo = window.prompt("Motivo da rejeição:");
    if (!motivo) return;
    try {
      await rejeitarAjuste(id, motivo);
      toast.success('Ajuste rejeitado.');
      loadAjustes();
    } catch (error) {
      toast.error('Erro ao rejeitar.');
    }
  };

  return (
    <div className="ajustes-container">
      <div className="ajustes-header">
        <h1>Central de Ajustes e Auditoria</h1>
        <p>Gerencie correções de ponto e monitore alterações sensíveis no sistema.</p>
      </div>

      {/* Navegação por Abas */}
      <div className="ajustes-tabs">
        <button 
          className={`tab-btn ${activeTab === 'ausencias' ? 'active' : ''}`}
          onClick={() => setActiveTab('ausencias')}
        >
          <span className="material-symbols-outlined">edit_calendar</span>
          Ajustes de Ausência
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
        {/* ABA 1: AJUSTES DE AUSÊNCIA (Código Original) */}
        {activeTab === 'ausencias' && (
          <div className="lista-ajustes">
            <h3>Solicitações Pendentes de Retificação</h3>
            {loading ? <p>Carregando...</p> : 
             ajustes.length === 0 ? <p className="empty-msg">Nenhuma solicitação pendente.</p> : (
              <div className="cards-grid">
                {ajustes.map(ajuste => (
                  <div key={ajuste.id} className="ajuste-card">
                    <div className="card-header">
                      <span className="tipo-tag">{ajuste.tipo_ajuste}</span>
                      <span className="data-tag">{new Date(ajuste.created_at).toLocaleDateString()}</span>
                    </div>
                    <p><strong>Colaborador:</strong> {ajuste.ausencia?.funcionarios?.nome_completo}</p>
                    <p><strong>Motivo:</strong> {ajuste.justificativa}</p>
                    
                    <div className="comparativo">
                      <div className="bloco antigo">
                        <small>Antes:</small>
                        <span>{new Date(ajuste.dados_anteriores.data_inicio).toLocaleDateString()}</span>
                      </div>
                      <span className="arrow">➝</span>
                      <div className="bloco novo">
                        <small>Depois:</small>
                        <span>{new Date(ajuste.novos_dados.data_inicio).toLocaleDateString()}</span>
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

        {/* ABA 2: AUDITORIA GLOBAL (Novo Componente) */}
        {activeTab === 'auditoria' && (
          <div className="auditoria-global">
            <h3>Monitoramento de Alterações (Últimos 50 eventos)</h3>
            <p style={{marginBottom: '20px', color: '#64748b'}}>
              Registro automático de todas as edições em cadastros de funcionários e tabelas críticas.
            </p>
            {/* Componente de Auditoria em Modo Global */}
            <TimelineAuditoria global={true} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AjustesPage;