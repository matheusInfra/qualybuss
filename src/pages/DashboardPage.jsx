import React from 'react';
import useSWR from 'swr';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import SkeletonCard from '../components/SkeletonCard';
import AniversariantesCard from '../components/Dashboard/AniversariantesCard'; // [NOVO] Importação
import './DashboardPage.css';

function DashboardPage() {
  const { user } = useAuth();

  const { data: kpis, isLoading: kpiLoading } = useSWR('dashboard_kpis', async () => {
    const { data, error } = await supabase.rpc('get_dashboard_kpis');
    if (error) throw error;
    return data;
  });

  const { data: ultimasAusencias, isLoading: listLoading } = useSWR('dashboard_latest_ausencias', async () => {
    const { data, error } = await supabase
      .from('solicitacoes_ausencia')
      .select('id, tipo, data_inicio, data_fim, status, funcionarios(nome_completo)')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Olá, Gestor</h1>
        <p>Aqui está o panorama geral da sua empresa hoje.</p>
      </header>

      {/* --- GRID DE KPIS --- */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info">
            <span className="kpi-label">Colaboradores Ativos</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{kpis?.total_colaboradores || 0}</span>}
          </div>
        </div>

        <div className="kpi-card orange">
          <div className="kpi-icon">🏖️</div>
          <div className="kpi-info">
            <span className="kpi-label">Ausentes Hoje</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{kpis?.ausentes_hoje || 0}</span>}
          </div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-label">Pendentes de Aprovação</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{kpis?.pendentes || 0}</span>}
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info">
            <span className="kpi-label">Folha Estimada (Base)</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{formatCurrency(kpis?.folha_pagamento)}</span>}
          </div>
        </div>
      </div>

      {/* --- SEÇÃO INFERIOR --- */}
      <div className="dashboard-content-grid">
        
        {/* Coluna Esquerda: Últimas Solicitações */}
        <div className="content-card">
          <div className="card-header">
            <h3>Últimas Movimentações</h3>
            <button className="btn-link" onClick={() => window.location.href='/ausencias'}>Ver todas</button>
          </div>
          <div className="table-responsive">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan="4" className="text-center">Carregando...</td></tr>
                ) : ultimasAusencias?.length === 0 ? (
                  <tr><td colSpan="4" className="text-center">Nenhum registro recente.</td></tr>
                ) : (
                  ultimasAusencias?.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-bold">{item.funcionarios?.nome_completo || 'N/A'}</td>
                      <td>{item.tipo}</td>
                      <td>{new Date(item.data_inicio).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${item.status?.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Coluna Direita: Acesso Rápido + Aniversariantes */}
        <div className="dashboard-right-col" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
          
          <div className="content-card">
            <div className="card-header">
              <h3>Acesso Rápido</h3>
            </div>
            <div className="quick-actions">
              <button className="action-btn" onClick={() => window.location.href='/funcionarios'}>
                <span>👤</span> Novo Colaborador
              </button>
              <button className="action-btn" onClick={() => window.location.href='/ausencias'}>
                <span>📅</span> Lançar Férias
              </button>
              <button className="action-btn" onClick={() => window.location.href='/documentos'}>
                <span>📁</span> Upload Doc
              </button>
              <button className="action-btn warning" onClick={() => window.location.href='/ajustes'}>
                <span>🛠️</span> Ajustes
              </button>
            </div>
          </div>

          {/* [NOVO] Widget de Aniversariantes */}
          <AniversariantesCard />

        </div>

      </div>
    </div>
  );
}

export default DashboardPage;