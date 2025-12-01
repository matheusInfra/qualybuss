// src/pages/DashboardPage.jsx
import React from 'react';
import useSWR from 'swr';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { getDashboardKPIs, getProximasFerias, getHistoricoKPIs } from '../services/dashboardService';
import { useAuth } from '../contexts/AuthContext';
import SkeletonCard from '../components/SkeletonCard';
import AniversariantesCard from '../components/Dashboard/AniversariantesCard';
import './DashboardPage.css';

function DashboardPage() {
  const { user } = useAuth();

  // KPIs Atuais
  const { data: kpis, isLoading: kpiLoading } = useSWR('dashboard_kpis', getDashboardKPIs);
  
  // Histórico para Gráficos
  const { data: historico } = useSWR('historico_kpis', getHistoricoKPIs);

  // Próximas Férias
  const { data: proximasFerias } = useSWR('proximas_ferias', getProximasFerias);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatDate = (dateStr) => {
    if(!dateStr) return '';
    const date = new Date(dateStr);
    // Ajuste de fuso simples para exibição
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Painel de Controle</h1>
        <p>Visão geral e evolução da sua operação.</p>
      </header>

      {/* --- GRID DE KPIS (Cards) --- */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info">
            <span className="kpi-label">Colaboradores</span>
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
            <span className="kpi-label">Pendências</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{kpis?.pendentes || 0}</span>}
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info">
            <span className="kpi-label">Folha Mensal</span>
            {kpiLoading ? <SkeletonCard /> : <span className="kpi-value">{formatCurrency(kpis?.folha_pagamento)}</span>}
          </div>
        </div>
      </div>

      {/* --- ÁREA DE GRÁFICOS (NOVO) --- */}
      <div className="charts-section">
        
        {/* Gráfico 1: Evolução da Folha */}
        <div className="chart-card">
          <h3>📈 Evolução da Folha Salarial</h3>
          <div style={{ width: '100%', height: 250 }}>
            {historico && historico.length > 0 ? (
              <ResponsiveContainer>
                <AreaChart data={historico}>
                  <defs>
                    <linearGradient id="colorFolha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data_referencia" tickFormatter={formatDate} style={{fontSize: '12px'}} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="total_folha" stroke="#10b981" fillOpacity={1} fill="url(#colorFolha)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Dados históricos sendo coletados...</div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Evolução do Quadro */}
        <div className="chart-card">
          <h3>👥 Evolução do Quadro</h3>
          <div style={{ width: '100%', height: 250 }}>
            {historico && historico.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={historico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data_referencia" tickFormatter={formatDate} style={{fontSize: '12px'}} />
                  <Tooltip />
                  <Bar dataKey="total_colaboradores" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Dados históricos sendo coletados...</div>
            )}
          </div>
        </div>

      </div>

      {/* --- LISTAS E ACESSO RÁPIDO --- */}
      <div className="dashboard-content-grid">
        
        {/* Próximas Férias */}
        <div className="content-card">
          <div className="card-header">
            <h3>🏖️ Próximas Férias (15 dias)</h3>
          </div>
          <div className="lista-ferias-simples">
            {proximasFerias?.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Nenhuma férias programada para breve.</p>
            ) : (
              proximasFerias?.map((item, idx) => (
                <div key={idx} className="item-ferias-row">
                  <div className="user-row">
                    <div className="avatar-mini">
                        {item.funcionario_id?.nome_completo?.charAt(0)}
                    </div>
                    <span>{item.funcionario_id?.nome_completo}</span>
                  </div>
                  <span className="data-badge">{new Date(item.data_inicio).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna Direita: Aniversariantes + Ações */}
        <div className="dashboard-right-col">
           <AniversariantesCard />
           
           <div className="quick-actions-card">
              <h3>Acesso Rápido</h3>
              <div className="quick-actions-grid">
                <button onClick={() => window.location.href='/funcionarios'}>👤 Novo</button>
                <button onClick={() => window.location.href='/ausencias'}>📅 Férias</button>
                <button onClick={() => window.location.href='/movimentacoes'}>💼 Cargos</button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

export default DashboardPage;