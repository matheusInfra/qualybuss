import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { supabase } from '../services/supabaseClient';
import { useEmpresa } from '../contexts/EmpresaContext';
import { 
  getDashboardKPIs, getProximasFerias, getHistoricoKPIs, 
  getKPIsEstrategicos, getAniversariantesMes 
} from '../services/dashboardService';

import AniversariantesCard from '../components/Dashboard/AniversariantesCard';
import SkeletonCard from '../components/SkeletonCard';
import './DashboardPage.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function DashboardPage() {
  const { minhasEmpresas } = useEmpresa();
  const [filtroEmpresa, setFiltroEmpresa] = useState('todas');
  const { mutate } = useSWRConfig();

  // Keys do SWR
  const keyKPIs = ['dashboard_kpis', filtroEmpresa];
  const keyEstrategicos = ['kpis_estrategicos', filtroEmpresa];
  const keyHistorico = ['historico_kpis', filtroEmpresa];
  const keyFerias = ['proximas_ferias', filtroEmpresa];
  const keyAniversario = ['aniversariantes', filtroEmpresa];

  // Buscas de Dados (SWR)
  const { data: kpis, isLoading: kpiLoading } = useSWR(keyKPIs, () => getDashboardKPIs(filtroEmpresa));
  const { data: kpisEstrategicos, isLoading: loadingStrat } = useSWR(keyEstrategicos, () => getKPIsEstrategicos(filtroEmpresa));
  const { data: historico } = useSWR(keyHistorico, () => getHistoricoKPIs(filtroEmpresa));
  const { data: proximasFerias } = useSWR(keyFerias, () => getProximasFerias(filtroEmpresa));
  const { data: aniversariantes } = useSWR(keyAniversario, () => getAniversariantesMes(filtroEmpresa));

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, () => {
        mutate(keyKPIs); mutate(keyEstrategicos); mutate(keyHistorico); mutate(keyAniversario);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitacoes_ausencia' }, () => {
        mutate(keyKPIs); mutate(keyFerias);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes' }, () => {
        mutate(keyKPIs); mutate(keyEstrategicos);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filtroEmpresa, mutate]);

  // Helpers
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const formatDate = (d) => { if(!d) return ''; const date = new Date(d); date.setMinutes(date.getMinutes() + date.getTimezoneOffset()); return date.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}); };
  const formatNome = (nome) => { const p = nome.split(' '); return p.length > 1 ? `${p[0]} ${p[p.length-1]}` : p[0]; };

  // PROTEÇÃO DE DADOS (Evita o crash do .map)
  const graficoDeptos = kpisEstrategicos?.grafico_deptos || [];
  const listaFerias = proximasFerias || [];
  // Para o card de aniversariantes, passamos o array seguro ou null para loading
  const listaAniversariantes = aniversariantes || []; 

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
            <option value="todas">Visão Geral (Todas as Lojas)</option>
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
          <div className="kpi-info"><span className="kpi-label">Colaboradores</span><span className="kpi-value">{kpiLoading ? <SkeletonCard/> : kpis?.total_colaboradores || 0}</span></div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon">🏖️</div>
          <div className="kpi-info"><span className="kpi-label">Ausentes Hoje</span><span className="kpi-value">{kpiLoading ? <SkeletonCard/> : kpis?.ausentes_hoje || 0}</span></div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-info"><span className="kpi-label">Pendências</span><span className="kpi-value">{kpiLoading ? <SkeletonCard/> : kpis?.pendentes || 0}</span></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon">💰</div>
          <div className="kpi-info"><span className="kpi-label">Folha Estimada</span><span className="kpi-value">{kpiLoading ? <SkeletonCard/> : formatCurrency(kpis?.folha_pagamento)}</span></div>
        </div>
      </div>

      {/* KPIs Estratégicos */}
      <h3 className="section-title">Indicadores Estratégicos</h3>
      <div className="kpi-grid-secondary">
        <div className="kpi-mini-card">
          <span className="label">Turnover (Mês)</span>
          <div className="value-row">
             {loadingStrat ? '...' : <strong>{kpisEstrategicos?.turnover}%</strong>}
             <span className="trend neutral">Entradas: {kpisEstrategicos?.admissoes_mes || 0} | Saídas: {kpisEstrategicos?.demissoes_mes || 0}</span>
          </div>
        </div>
        <div className="kpi-mini-card">
          <span className="label">Tempo Médio de Casa</span>
          <div className="value-row">
             {loadingStrat ? '...' : <strong>{kpisEstrategicos?.tempo_medio} Anos</strong>}
          </div>
        </div>
        <div className="kpi-mini-card">
          <span className="label">Ticket Médio / Func.</span>
          <div className="value-row">
             {loadingStrat ? '...' : <strong>{formatCurrency(kpisEstrategicos?.ticket_medio)}</strong>}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>📈 Evolução da Folha</h3>
          <div style={{ width: '100%', height: '300px', minWidth: 0 }}>
            {historico && historico.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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
            ) : <div className="chart-empty">Dados históricos insuficientes.</div>}
          </div>
        </div>

        <div className="chart-card">
          <h3>🏢 Headcount por Departamento</h3>
          <div style={{ width: '100%', height: '300px', minWidth: 0 }}>
            {/* CORREÇÃO: Usamos graficoDeptos que é garantido ser array */}
            {graficoDeptos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={graficoDeptos} 
                    cx="50%" cy="50%" 
                    innerRadius={60} outerRadius={80} 
                    fill="#8884d8" paddingAngle={5} 
                    dataKey="value" label
                  >
                    {graficoDeptos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty">{loadingStrat ? 'Carregando...' : 'Sem dados.'}</div>}
          </div>
        </div>
      </div>

      {/* Listas Inferiores */}
      <div className="dashboard-content-grid">
        <div className="content-card">
          <h3>🏖️ Próximas Férias (15 dias)</h3>
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
          {/* Passamos a prop data explicitamente para evitar erros internos no card */}
          <AniversariantesCard data={listaAniversariantes} />
          
          <div className="quick-actions-card">
            <h3>Acesso Rápido</h3>
            <div className="quick-actions-grid">
              <button onClick={() => window.location.href = '/funcionarios/novo'}>👤 Novo</button>
              <button onClick={() => window.location.href = '/ferias'}>📅 Férias</button>
              <button onClick={() => window.location.href = '/movimentacoes'}>💼 Cargos</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default DashboardPage;