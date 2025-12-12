import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '../services/supabaseClient';
import { useEmpresa } from '../contexts/EmpresaContext';
import {
  getDashboardKPIs, getProximasFerias, getHistoricoKPIs,
  getKPIsEstrategicos, getAniversariantesMes
} from '../services/dashboardService';

import AprovacaoPendencias from '../components/Ausencias/AprovacaoPendencias';
import AniversariantesCard from '../components/Dashboard/AniversariantesCard';
import SkeletonCard from '../components/SkeletonCard';
import './DashboardPage.css';

// [ATUALIZADO] Paleta de cores harmonizada com o tema (Indigo, Emerald, Amber, Rose, Purple, Blue)
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

// [NOVO] Componente de Tooltip Customizado
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        minWidth: '150px'
      }}>
        {label && <p style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>{label}</p>}
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', fontSize: '0.875rem', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }}></div>
              <span style={{ color: '#64748b' }}>{entry.name === 'total_folha' ? 'Total Folha' : entry.name}:</span>
            </div>
            <span style={{ fontWeight: '600', color: '#334155' }}>
              {typeof entry.value === 'number'
                ? entry.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function DashboardPage() {
  const { minhasEmpresas } = useEmpresa();
  const [filtroEmpresa, setFiltroEmpresa] = useState('todas');
  const [showPendenciasModal, setShowPendenciasModal] = useState(false);
  const { mutate } = useSWRConfig();

  const keyKPIs = ['dashboard_kpis', filtroEmpresa];
  const keyEstrategicos = ['kpis_estrategicos', filtroEmpresa];
  const keyHistorico = ['historico_kpis', filtroEmpresa];
  const keyFerias = ['proximas_ferias', filtroEmpresa];
  const keyAniversario = ['aniversariantes', filtroEmpresa];

  // Fetchers
  const { data: kpis, isLoading: kpiLoading } = useSWR(keyKPIs, () => getDashboardKPIs(filtroEmpresa));
  const { data: kpisEstrategicos, isLoading: loadingStrat } = useSWR(keyEstrategicos, () => getKPIsEstrategicos(filtroEmpresa));
  const { data: historico } = useSWR(keyHistorico, () => getHistoricoKPIs(filtroEmpresa));
  const { data: proximasFerias } = useSWR(keyFerias, () => getProximasFerias(filtroEmpresa));
  const { data: aniversariantes } = useSWR(keyAniversario, () => getAniversariantesMes(filtroEmpresa));

  // Realtime Listeners
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, () => {
        mutate(keyKPIs); mutate(keyEstrategicos); mutate(keyHistorico); mutate(keyAniversario);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_ausencia' }, () => {
        mutate(keyKPIs); mutate(keyFerias);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filtroEmpresa, mutate]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (d) => { if (!d) return ''; const date = new Date(d); date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); };

  // Variáveis auxiliares para renderização segura
  const graficoDeptos = kpisEstrategicos?.grafico_deptos || [];
  const listaHistorico = historico || [];
  const listaFerias = proximasFerias || [];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header-row">
        <div>
          <h1>Painel de Controle</h1>
          <p>Visão em tempo real da sua operação.</p>
        </div>
        <div className="store-selector">
          <span className="material-symbols-outlined icon">store</span>
          <select value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
            <option value="todas">Visão Geral (Todas)</option>
            {minhasEmpresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
            ))}
          </select>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info"><span className="kpi-label">Colaboradores</span><span className="kpi-value">{kpiLoading ? <SkeletonCard /> : kpis?.total_colaboradores || 0}</span></div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon">🏖️</div>
          <div className="kpi-info"><span className="kpi-label">Ausentes Hoje</span><span className="kpi-value">{kpiLoading ? <SkeletonCard /> : kpis?.ausentes_hoje || 0}</span></div>
        </div>

        <div
          className="kpi-card red action-hover"
          onClick={() => kpis?.pendentes > 0 && setShowPendenciasModal(true)}
          style={{ cursor: kpis?.pendentes > 0 ? 'pointer' : 'default' }}
        >
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info">
            <span className="kpi-label">Pendências (Clique)</span>
            <span className="kpi-value">{kpiLoading ? <SkeletonCard /> : kpis?.pendentes || 0}</span>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info"><span className="kpi-label">Folha Estimada</span><span className="kpi-value">{kpiLoading ? <SkeletonCard /> : formatCurrency(kpis?.folha_pagamento)}</span></div>
        </div>
      </div>

      <h3 className="section-title">Indicadores Estratégicos</h3>
      <div className="kpi-grid-secondary">
        <div className="kpi-mini-card">
          <span className="label">Turnover (Mês)</span>
          <div className="value-row">
            {loadingStrat ? '...' : <strong>{kpisEstrategicos?.turnover}%</strong>}
          </div>
        </div>
        <div className="kpi-mini-card">
          <span className="label">Tempo Médio de Casa</span>
          <div className="value-row">
            {loadingStrat ? '...' : <strong>{kpisEstrategicos?.tempo_medio} Anos</strong>}
          </div>
        </div>
        <div className="kpi-mini-card">
          <span className="label">Ticket Médio</span>
          <div className="value-row">
            {loadingStrat ? '...' : <strong>{formatCurrency(kpisEstrategicos?.ticket_medio)}</strong>}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 Evolução da Folha</h3>
          {/* FIX: width='99%' e debounce ajudam o Recharts no Grid Layout */}
          <div style={{ width: '99%', height: '300px', minWidth: 0 }}>
            {listaHistorico && listaHistorico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <AreaChart data={listaHistorico}>
                  <defs>
                    <linearGradient id="colorFolha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="data_referencia"
                    tickFormatter={formatDate}
                    style={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total_folha"
                    name="Total Folha"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorFolha)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">Sem dados históricos.</div>}
          </div>
        </div>

        <div className="chart-card">
          <h3>🏢 Distribuição por Departamento</h3>
          <div style={{ width: '99%', height: '300px', minWidth: 0 }}>
            {graficoDeptos && graficoDeptos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <PieChart>
                  <Pie
                    data={graficoDeptos}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {graficoDeptos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#64748b', fontSize: '12px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">{loadingStrat ? 'Carregando...' : 'Sem dados.'}</div>}
          </div>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <div className="content-card">
          <h3>🏖️ Próximas Férias</h3>
          <div className="lista-ferias-simples">
            {listaFerias.length === 0 && <p className="text-center text-gray-400 py-4">Nenhuma programada.</p>}
            {listaFerias.map((item, i) => (
              <div key={i} className="item-ferias-row">
                <div className="user-row">
                  <div className="avatar-mini">{item.funcionario_id?.nome_completo?.charAt(0) || 'U'}</div>
                  <span>{item.funcionario_id?.nome_completo}</span>
                </div>
                <span className="data-badge">{formatDate(item.data_inicio)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dashboard-right-col">
          <AniversariantesCard data={aniversariantes || []} />
        </div>
      </div>

      {showPendenciasModal && (
        <div className="modal-overlay" onClick={() => setShowPendenciasModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔔 Resolução Rápida de Pendências</h3>
              <button onClick={() => setShowPendenciasModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <AprovacaoPendencias />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardPage;