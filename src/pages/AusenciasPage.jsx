// src/pages/AusenciasPage.jsx
import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getTodasSolicitacoes, updateStatusSolicitacao, deleteSolicitacao } from '../services/ausenciaService';
import { getAvatarPublicUrl } from '../services/funcionarioService';

// Componentes Internos (Certifique-se de tê-los criados conforme abaixo)
import SolicitacaoAusenciaForm from '../components/Ausencias/SolicitacaoAusenciaForm';
import GerenciarPeriodos from '../components/Ausencias/GerenciarPeriodos';

import './AusenciasPage.css';

function AusenciasPage() {
  const [modalType, setModalType] = useState(null); // 'nova', 'saldos' ou null
  const { data: solicitacoes, isLoading } = useSWR('getTodasSolicitacoes', getTodasSolicitacoes);
  const { mutate } = useSWRConfig();

  // --- Ações de Workflow ---
  const handleAprovar = async (id) => {
    const toastId = toast.loading('Aprovando...');
    try {
      await updateStatusSolicitacao(id, 'Aprovado');
      toast.success('Solicitação Aprovada!', { id: toastId });
      mutate('getTodasSolicitacoes');
    } catch (e) { 
      toast.error('Erro ao aprovar.', { id: toastId }); 
    }
  };

  const handleRejeitar = async (id) => {
    if(!window.confirm("Tem certeza que deseja REJEITAR esta solicitação?")) return;
    try {
      await updateStatusSolicitacao(id, 'Rejeitado');
      toast.success('Solicitação Rejeitada.');
      mutate('getTodasSolicitacoes');
    } catch (e) { toast.error('Erro ao rejeitar.'); }
  };

  const handleExcluir = async (id) => {
    if(!window.confirm("Excluir permanentemente este registro?")) return;
    try {
      await deleteSolicitacao(id);
      toast.success('Registro removido.');
      mutate('getTodasSolicitacoes');
    } catch (e) { toast.error('Erro ao excluir.'); }
  };

  // Helper para cores das etiquetas
  const getCategoriaStyle = (cat) => {
    switch(cat) {
      case 'Ferias': return { bg: '#e0f2fe', text: '#0369a1' }; // Azul
      case 'Saude': return { bg: '#fee2e2', text: '#b91c1c' }; // Vermelho
      case 'Pessoal': return { bg: '#f3e8ff', text: '#7e22ce' }; // Roxo
      default: return { bg: '#f1f5f9', text: '#475569' }; // Cinza
    }
  };

  return (
    <div className="ausencias-container" style={{padding: '24px', maxWidth: '1200px', margin: '0 auto'}}>
      
      {/* Cabeçalho */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px'}}>
        <div>
          <h1 style={{margin: 0, fontSize: '2rem', color: '#1a202c'}}>Gestão de Ausências</h1>
          <p style={{color: '#718096', margin: '4px 0 0 0'}}>Central de controle de férias e licenças.</p>
        </div>
        
        <div style={{display: 'flex', gap: '12px'}}>
          <button 
            className="button-secondary" 
            onClick={() => setModalType('saldos')}
            style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: '1px solid #cbd5e0', borderRadius: '6px', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#4a5568'}}
          >
            <span className="material-symbols-outlined">tune</span>
            Ajuste de Saldos
          </button>

          <button 
            className="button-primary" 
            onClick={() => setModalType('nova')}
            style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', border: 'none', borderRadius: '6px', background: '#28a745', cursor: 'pointer', fontWeight: 600, color: 'white'}}
          >
            <span className="material-symbols-outlined">add</span>
            Nova Solicitação
          </button>
        </div>
      </div>

      {/* Tabela de Solicitações */}
      <div style={{background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflowX: 'auto'}}>
        <table style={{width: '100%', borderCollapse: 'collapse', minWidth: '800px'}}>
          <thead style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
            <tr>
              <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Colaborador</th>
              <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Categoria</th>
              <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Período</th>
              <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Dias</th>
              <th style={{padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Status</th>
              <th style={{padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan="6" style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>Carregando solicitações...</td></tr>}
            
            {!isLoading && solicitacoes?.length === 0 && (
              <tr><td colSpan="6" style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>Nenhuma solicitação encontrada.</td></tr>
            )}

            {solicitacoes?.map(sol => {
              const style = getCategoriaStyle(sol.categoria);
              return (
                <tr key={sol.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                  <td style={{padding: '16px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <img 
                        src={sol.funcionarios?.avatar_url ? getAvatarPublicUrl(sol.funcionarios.avatar_url) : 'https://placehold.co/40'} 
                        style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover'}} 
                        alt="Avatar"
                      />
                      <div>
                        <div style={{fontWeight: 600, color: '#334155'}}>{sol.funcionarios?.nome_completo}</div>
                        <div style={{fontSize: '0.8rem', color: '#94a3b8'}}>{sol.funcionarios?.cargo}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding: '16px'}}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                      background: style.bg, color: style.text
                    }}>
                      {sol.tipo}
                    </span>
                  </td>
                  <td style={{padding: '16px', fontSize: '0.9rem', color: '#334155'}}>
                    {new Date(sol.data_inicio).toLocaleDateString('pt-BR')} 
                    <span style={{color: '#94a3b8', margin: '0 4px'}}>até</span> 
                    {new Date(sol.data_fim).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{padding: '16px', fontWeight: 600, color: '#334155'}}>
                    {sol.quantidade}
                  </td>
                  <td style={{padding: '16px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: sol.status === 'Aprovado' ? '#22c55e' : sol.status === 'Rejeitado' ? '#ef4444' : '#f59e0b'
                      }}></div>
                      <span style={{fontSize: '0.9rem', color: '#475569'}}>{sol.status}</span>
                    </div>
                  </td>
                  <td style={{padding: '16px', textAlign: 'right'}}>
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                      {sol.status === 'Pendente' && (
                        <>
                          <button onClick={() => handleAprovar(sol.id)} title="Aprovar" style={{background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <span className="material-symbols-outlined" style={{fontSize: '18px'}}>check</span>
                          </button>
                          <button onClick={() => handleRejeitar(sol.id)} title="Rejeitar" style={{background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            <span className="material-symbols-outlined" style={{fontSize: '18px'}}>close</span>
                          </button>
                        </>
                      )}
                      <button onClick={() => handleExcluir(sol.id)} title="Excluir" style={{background: '#fff', border: '1px solid #e2e8f0', color: '#94a3b8', width: '32px', height: '32px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <span className="material-symbols-outlined" style={{fontSize: '18px'}}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: NOVA SOLICITAÇÃO */}
      {modalType === 'nova' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '600px', padding: '0', overflow: 'hidden'}}>
            <div style={{padding: '20px 24px', borderBottom: '1px solid #eee', background: '#fff'}}>
              <h2 style={{margin: 0, fontSize: '1.25rem', color: '#1e293b'}}>Nova Solicitação</h2>
            </div>
            <div style={{padding: '24px', maxHeight: '80vh', overflowY: 'auto'}}>
              <SolicitacaoAusenciaForm onClose={() => setModalType(null)} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTE DE SALDOS */}
      {modalType === 'saldos' && (
        <div className="modal-overlay" onClick={() => setModalType(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '550px', padding: '0', overflow: 'hidden'}}>
            <div style={{padding: '20px 24px', borderBottom: '1px solid #eee', background: '#fff'}}>
              <h2 style={{margin: 0, fontSize: '1.25rem', color: '#1e293b'}}>Ajuste de Saldos & Histórico</h2>
              <p style={{margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b'}}>Corrija saldos de funcionários ou dê baixa em períodos antigos.</p>
            </div>
            <div style={{padding: '24px', maxHeight: '80vh', overflowY: 'auto'}}>
              <GerenciarPeriodos onClose={() => setModalType(null)} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AusenciasPage;