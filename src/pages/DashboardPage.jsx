import React from 'react';
import useSWR from 'swr';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import SkeletonCard from '../components/SkeletonCard';
import './DashboardPage.css'; // Importação do CSS específico

function DashboardPage() {
  const { user } = useAuth();

  // 1. Fetch dos KPIs usando a função RPC 'get_dashboard_kpis'
  // Essa função retorna um JSON: { total_colaboradores, pendentes, ausentes_hoje, folha_pagamento }
  const { data: kpis, error: kpiError, isLoading: kpiLoading } = useSWR('dashboard_kpis', async () => {
    const { data, error } = await supabase.rpc('get_dashboard_kpis');
    if (error) throw error;
    return data; // O retorno já é um objeto JSON direto
  });

  // 2. Fetch das Ausências Recentes (Últimos 5 registros) para a tabela rápida
  const { data: ultimasAusencias, isLoading: listLoading } = useSWR('dashboard_latest_ausencias', async () => {
    const { data, error } = await supabase
      .from('solicitacoes_ausencia')
      .select('id, tipo, data_inicio, data_fim, status, funcionarios(nome_completo)')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data;
  });

  // Função auxiliar para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Olá, Gestor</h1>
        <p>Aqui está o panorama geral da sua empresa hoje.</p>
      </header>

      {/* --- GRID DE KPIS (Indicadores) --- */}
      <div className="kpi-grid">
        {/* Card 1: Total Colaboradores */}
        <div className="kpi-card blue">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info">
            <span className="kpi-label">Colaboradores Ativos</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{kpis?.total_colaboradores || 0}</span>}
          </div>
        </div>

        {/* Card 2: Ausentes Hoje */}
        <div className="kpi-card orange">
          <div className="kpi-icon">🏖️</div>
          <div className="kpi-info">
            <span className="kpi-label">Ausentes Hoje</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{kpis?.ausentes_hoje || 0}</span>}
          </div>
        </div>

        {/* Card 3: Solicitações Pendentes */}
        <div className="kpi-card red">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-label">Pendentes de Aprovação</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{kpis?.pendentes || 0}</span>}
          </div>
        </div>

        {/* Card 4: Folha Estimada */}
        <div className="kpi-card green">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info">
            <span className="kpi-label">Folha Estimada (Base)</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{formatCurrency(kpis?.folha_pagamento)}</span>}
          </div>
        </div>
      </div>

      {/* --- SEÇÃO INFERIOR: GRÁFICOS E LISTAS --- */}
      <div className="dashboard-content-grid">
        
        {/* Coluna Esquerda: Últimas Solicitações */}
        <div className="content-card">
          <div className="card-header">
            <h3>Últimas Movimentações</h3>
            <button className="btn-link">Ver todas</button>
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

        {/* Coluna Direita: Acesso Rápido / Dicas */}
        <div className="content-card">
          <div className="card-header">
            <h3>Acesso Rápido</h3>
          </div>
          <div className="quick-actions">
            <button className="action-btn" onClick={() => window.location.href='/funcionarios'}>
              <span>👤</span> Novo Funcionário
            </button>
            <button className="action-btn" onClick={() => window.location.href='/ausencias'}>
              <span>📅</span> Lançar Férias
            </button>
            <button className="action-btn" onClick={() => window.location.href='/documentos'}>
              <span>📁</span> Upload Documento
            </button>
            <button className="action-btn warning" onClick={() => window.location.href='/ajustes'}>
              <span>🛠️</span> Correção / Ajuste
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;