// src/pages/DashboardPage.jsx
import React from 'react';
import useSWR from 'swr';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getDashboardKPIs, getAusenciasPorTipo, getProximasFerias } from '../services/dashboardService';
import { getTodasMovimentacoes } from '../services/movimentacaoService';
import { getAvatarPublicUrl } from '../services/funcionarioService';
import './DashboardPage.css';

// Helper para formatar R$
const formatCurrency = (value) => {
  if (!value) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Helper para formatar data (para a lista de férias)
const formatDataFerias = (dataStr) => {
  const data = new Date(dataStr.replace(/-/g, '/'));
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// --- 1. Componente: Os 4 KPIs Principais ---
function KpiCards() {
  const { data: kpis, error, isLoading } = useSWR('dashboardKPIs', getDashboardKPIs);

  if (isLoading) return <div className="kpi-grid"><div className="kpi-card loading"></div></div>;
  if (error) return <p className="error-message">Erro ao carregar KPIs.</p>;

  return (
    <div className="kpi-grid">
      <div className="kpi-card">
        <span className="kpi-label">Total de Colaboradores</span>
        <span className="kpi-value">{kpis?.total_colaboradores || 0}</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">Solicitações Pendentes</span>
        <span className="kpi-value warning">{kpis?.pendentes || 0}</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">Ausentes Hoje</span>
        <span className="kpi-value">{kpis?.ausentes_hoje || 0}</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">Folha de Pagamento (Mensal)</span>
        <span className="kpi-value">{formatCurrency(kpis?.folha_pagamento)}</span>
      </div>
    </div>
  );
}

// --- 2. Componente: Gráfico de Pizza (Ausências) ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
function AusenciasChart() {
  const { data, error, isLoading } = useSWR('ausenciasPorTipo', getAusenciasPorTipo);

  if (isLoading) return <div className="dashboard-widget loading"></div>;
  if (error || !data || data.length === 0) return <div className="dashboard-widget"><p>Sem dados de ausência.</p></div>;

  return (
    <div className="dashboard-widget">
      <h3>Ausências (Últ. 90 dias)</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="tipo"
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- 3. Componente: Lista de Próximas Férias ---
function ProximasFerias() {
  const { data, error, isLoading } = useSWR('proximasFerias', getProximasFerias);

  if (isLoading) return <div className="dashboard-widget loading"></div>;
  if (error) return <div className="dashboard-widget"><p>Erro ao buscar férias.</p></div>;
  
  return (
    <div className="dashboard-widget">
      <h3>Próximas Férias (14 dias)</h3>
      <div className="lista-widget">
        {!data || data.length === 0 ? (
          <p className="lista-empty">Nenhuma férias agendada.</p>
        ) : (
          data.map(item => {
            // --- CORREÇÃO AQUI ---
            // O objeto com os dados do funcionário está em 'id_funcionario'
            const funcionario = item.id_funcionario; 
            if (!funcionario) return null; // Pula se o funcionário foi deletado

            return (
              <div key={item.data_inicio} className="lista-item">
                <img 
                  src={funcionario.avatar_url ? getAvatarPublicUrl(funcionario.avatar_url) : 'https://placehold.co/100'} 
                  alt={funcionario.nome_completo} 
                  className="lista-avatar"
                />
                <div className="lista-info">
                  <span className="lista-nome">{funcionario.nome_completo}</span>
                  <span className="lista-detalhe">Início: {formatDataFerias(item.data_inicio)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}

// --- 4. Componente: Lista de Últimas Movimentações ---
function UltimasMovimentacoes() {
  const { data, error, isLoading } = useSWR('todasMovimentacoes', getTodasMovimentacoes);

  if (isLoading) return <div className="dashboard-widget loading"></div>;
  if (error) return <div className="dashboard-widget"><p>Erro ao buscar movimentações.</p></div>;

  return (
    <div className="dashboard-widget">
      <h3>Últimas Movimentações</h3>
      <div className="lista-widget">
        {!data || data.length === 0 ? (
          <p className="lista-empty">Nenhuma movimentação recente.</p>
        ) : (
          data.map(mov => {
            // --- CORREÇÃO AQUI ---
            // O objeto com os dados do funcionário está em 'id_funcionario'
            const funcionario = mov.id_funcionario; 
            if (!funcionario) return null; // Pula se o funcionário foi deletado
            
            return (
              <div key={mov.id} className="lista-item">
                <div className="lista-info">
                  <span className="lista-nome">{mov.tipo}: {funcionario.nome_completo}</span>
                  <span className="lista-detalhe">{mov.descricao}</span>
                </div>
                <span className="lista-data">{formatDataFerias(mov.data_movimentacao)}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
}


// --- Página Principal do Dashboard ---
function DashboardPage() {
  return (
    <div className="dashboard-container">
      <h1 className="dashboard-title">Dashboard</h1>
      
      {/* 1. KPIs */}
      <KpiCards />

      {/* 2. Grid de Widgets */}
      <div className="dashboard-grid">
        <AusenciasChart />
        <ProximasFerias />
        <UltimasMovimentacoes />
      </div>
    </div>
  );
}

export default DashboardPage;