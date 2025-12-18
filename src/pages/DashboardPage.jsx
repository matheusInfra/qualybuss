import React, { useState, useEffect, useRef } from 'react';
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

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip" style={{
        backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '150px', zIndex: 100
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
  
  // Ref para controlar o canal de subscription e evitar vazamento de memória ou erro de WS
  const channelRef = useRef(null);

  const keyKPIs = ['dashboard_kpis', filtroEmpresa];
  const keyEstrategicos = ['kpis_estrategicos', filtroEmpresa];
  const keyHistorico = ['historico_kpis', filtroEmpresa];
  const keyFerias = ['proximas_ferias', filtroEmpresa];
  const keyAniversario = ['aniversariantes', filtroEmpresa];

  const { data: kpis, isLoading: kpiLoading } = useSWR(keyKPIs, () => getDashboardKPIs(filtroEmpresa));
  const { data: kpisEstrategicos, isLoading: loadingStrat } = useSWR(keyEstrategicos, () => getKPIsEstrategicos(filtroEmpresa));
  const { data: historico } = useSWR(keyHistorico, () => getHistoricoKPIs(filtroEmpresa));
  const { data: proximasFerias } = useSWR(keyFerias, () => getProximasFerias(filtroEmpresa));
  const { data: aniversariantes } = useSWR(keyAniversario, () => getAniversariantesMes(filtroEmpresa));

  // --- CORREÇÃO WEBSOCKET (REALTIME) ---
  useEffect(() => {
    // Se já existe um canal aberto, limpa antes de criar novo (evita duplicidade rápida)
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`dashboard-room-${Date.now()}`) // Nome único para evitar conflito
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, () => {
        mutate(keyKPIs); mutate(keyEstrategicos); mutate(keyHistorico); mutate(keyAniversario);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_ausencia' }, () => {
        mutate(keyKPIs); mutate(keyFerias);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Conectado com sucesso
        }
      });

    channelRef.current = channel;

    return () => {
      // Cleanup seguro
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(err => {
           // Ignora erro de fechamento se o socket já caiu
           console.warn("Aviso de cleanup WS:", err.message); 
        });
        channelRef.current = null;
      }
    };
  }, [filtroEmpresa, mutate]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const formatDateChart = (d) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    } catch (e) { return d; }
  };
  
  const formatDateSimple = (d) => {
    if (!d) return '';
    const date = new Date(d);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const graficoDeptos = kpisEstrategicos?.grafico_deptos || [];
  const listaHistorico = historico || [];
  const listaFerias = proximasFerias || [];

  return (
    <div className="dashboard-container fade-in">
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
            {loadingStrat ? '...' : <strong>{kpisEstrategicos?.turnover || 0}%</strong>}
          </div>
        </div>
        <div className="kpi-mini-card">
          <span className="label">Tempo Médio de Casa</span>
          <div className="value-row">
            {loadingStrat ? '...' : <strong>{kpisEstrategicos?.tempo_medio || 0} Anos</strong>}
          </div>
        </div>
        <div className="kpi-mini-card">
          <span className="label">Ticket Médio</span>
          <div className="value-row">
            {loadingStrat ? '...' : <strong>{formatCurrency(kpisEstrategicos?.ticket_medio)}</strong>}
          </div>
        </div>
      </div>

      {/* Gráficos - CORREÇÃO RECHARTS: Wrapper explícito e width 99% */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 Evolução da Folha</h3>
          {/* Wrapper com altura fixa e width 99% para forçar layout */}
          <div className="chart-wrapper-fixed">
            {listaHistorico && listaHistorico.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={listaHistorico}>
                  <defs>
                    <linearGradient id="colorFolha" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="data_referencia"
                    tickFormatter={formatDateChart}
                    style={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                    minTickGap={30}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Area
                    type="monotone"
                    dataKey="total_folha"
                    name="Total Folha"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#colorFolha)"
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    isAnimationActive={false} // Desabilita animação inicial para evitar erro de cálculo rápido
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <span className="material-symbols-outlined" style={{fontSize:'48px', color:'#cbd5e1'}}>query_stats</span>
                <p>Calculando histórico...</p>
              </div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3>🏢 Distribuição por Departamento</h3>
          <div className="chart-wrapper-fixed">
            {graficoDeptos && graficoDeptos.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={graficoDeptos}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    isAnimationActive={false} // Estabilidade visual
                  >
                    {graficoDeptos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', lineHeight: '20px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                 <p>{loadingStrat ? 'Carregando dados...' : 'Sem dados de departamentos.'}</p>
              </div>
            )}
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
                  <span>{item.funcionario_id?.nome_completo || 'Colaborador'}</span>
                </div>
                <span className="data-badge">{formatDateSimple(item.data_inicio)}</span>
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