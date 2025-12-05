import React from 'react';
import useSWR from 'swr';
import {
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { getDashboardKPIs, getProximasFerias, getHistoricoKPIs } from '../services/dashboardService';
import AniversariantesCard from '../components/Dashboard/AniversariantesCard';
import SkeletonCard from '../components/SkeletonCard';
import './DashboardPage.css';

function DashboardPage() {
  const { data: kpis, isLoading: kpiLoading } = useSWR('dashboard_kpis', getDashboardKPIs);
  const { data: historico } = useSWR('historico_kpis', getHistoricoKPIs);
  const { data: proximasFerias } = useSWR('proximas_ferias', getProximasFerias);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (str) => {
    if (!str) return '';
    const d = new Date(str);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Painel de Controle</h1>
        <p>Visão geral da operação.</p>
      </header>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info"><span className="kpi-label">Colaboradores</span><span className="kpi-value">{kpiLoading ? '...' : kpis?.total_colaboradores || 0}</span></div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon">🏖️</div>
          <div className="kpi-info"><span className="kpi-label">Ausentes</span><span className="kpi-value">{kpiLoading ? '...' : kpis?.ausentes_hoje || 0}</span></div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info"><span className="kpi-label">Pendências</span><span className="kpi-value">{kpiLoading ? '...' : kpis?.pendentes || 0}</span></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info"><span className="kpi-label">Folha</span><span className="kpi-value">{kpiLoading ? '...' : formatCurrency(kpis?.folha_pagamento)}</span></div>
        </div>
      </div>

      {/* GRÁFICOS - CORREÇÃO AQUI */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 Evolução da Folha</h3>
          {/* Container com altura fixa para o Recharts não se perder */}
          <div style={{ width: '100%', height: 300 }}>
            {historico && historico.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={historico}>
                  <defs>
                    <linearGradient id="colorFolha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data_referencia" tickFormatter={formatDate} style={{fontSize: 12}} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="total_folha" stroke="#10b981" fill="url(#colorFolha)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">Sem dados históricos.</div>}
          </div>
        </div>

        <div className="chart-card">
          <h3>👥 Evolução do Quadro</h3>
          <div style={{ width: '100%', height: 300 }}>
            {historico && historico.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={historico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="data_referencia" tickFormatter={formatDate} style={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="total_colaboradores" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">Sem dados históricos.</div>}
          </div>
        </div>
      </div>

      {/* Filas */}
      <div className="dashboard-content-grid">
        <div className="content-card">
          <h3>🏖️ Próximas Férias</h3>
          <div className="lista-ferias-simples">
            {proximasFerias?.length === 0 && <p className="text-center text-gray-400">Nenhuma programada.</p>}
            {proximasFerias?.map((item, i) => (
              <div key={i} className="item-ferias-row">
                <span>{item.funcionario_id?.nome_completo}</span>
                <span className="data-badge">{formatDate(item.data_inicio)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-right-col">
          <AniversariantesCard />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;