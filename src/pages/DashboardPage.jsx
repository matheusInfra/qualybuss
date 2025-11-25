// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { getFuncionarios } from '../services/funcionarioService';
import { runComplianceRadar } from '../utils/intelligenceRadar';
import './DashboardPage.css';

// Função de fetch genérico para o SWR usar no Supabase
const fetcher = async (table) => {
    const { data, error } = await supabase.from(table).select('*, funcionarios(nome_completo)');
    if (error) throw error;
    return data;
};

function DashboardPage() {
  const [alertas, setAlertas] = useState([]);
  const navigate = useNavigate();

  // --- CARREGAMENTO DE DADOS ---
  // 1. KPIs Rápidos (Mantendo o que você provavelmente já tinha)
  const { data: kpis } = useSWR('get_dashboard_kpis', async () => {
    const { data, error } = await supabase.rpc('get_dashboard_kpis');
    if (error) return null; // ou throw
    return data;
  });

  // 2. Dados para o Radar de Inteligência
  const { data: funcionarios } = useSWR('funcionarios_radar', getFuncionarios);
  const { data: periodos } = useSWR('periodos_aquisitivos', () => fetcher('periodos_aquisitivos'));
  const { data: creditos } = useSWR('historico_creditos', () => fetcher('historico_creditos'));

  // --- MOTOR DE INTELIGÊNCIA ---
  useEffect(() => {
    if (funcionarios && periodos && creditos) {
      // Roda o algoritmo de compliance
      const resultados = runComplianceRadar(funcionarios, periodos, creditos);
      setAlertas(resultados);
    }
  }, [funcionarios, periodos, creditos]);

  return (
    <div className="dashboard-container fade-in">
      <header className="dashboard-header mb-6">
        <div>
            <h1 className="dashboard-title">Visão Geral</h1>
            <p className="text-gray-500 text-sm">Bem-vindo ao painel de controle QualyBuss.</p>
        </div>
        <div className="date-badge">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </header>

      {/* --- SEÇÃO 1: RADAR DE COMPLIANCE (NOVO) --- */}
      {alertas.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center mb-4">
            <span className="material-symbols-outlined text-yellow-600 mr-2">notifications_active</span>
            <h2 className="text-lg font-bold text-gray-700">Atenção Necessária ({alertas.length})</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertas.map((alerta, idx) => (
              <div 
                key={idx} 
                className={`p-4 rounded-lg border-l-4 shadow-sm bg-white transition-transform hover:scale-[1.02] cursor-pointer
                  ${alerta.tipo === 'CRITICO' ? 'border-red-500' : 
                    alerta.tipo === 'ALERTA' ? 'border-yellow-500' : 'border-blue-400'}`
                }
                onClick={() => navigate(alerta.rota)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sm text-gray-800">{alerta.titulo}</h4>
                  {alerta.tipo === 'CRITICO' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase">Crítico</span>}
                </div>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">{alerta.mensagem}</p>
                <div className="flex justify-end">
                    <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center">
                    {alerta.acao} <span className="material-symbols-outlined text-[16px] ml-1">arrow_forward</span>
                    </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- SEÇÃO 2: KPIs (Métricas Rápidas) --- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="kpi-card bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                <span className="material-symbols-outlined">groups</span>
            </div>
            <div>
                <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider">Colaboradores</span>
                <span className="text-2xl font-bold text-gray-800">{kpis?.total_colaboradores || 0}</span>
            </div>
        </div>

        <div className="kpi-card bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-orange-50 text-orange-600 mr-4">
                <span className="material-symbols-outlined">pending_actions</span>
            </div>
            <div>
                <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider">Pendências</span>
                <span className="text-2xl font-bold text-gray-800">{kpis?.pendentes || 0}</span>
            </div>
        </div>

        <div className="kpi-card bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 mr-4">
                <span className="material-symbols-outlined">event_busy</span>
            </div>
            <div>
                <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider">Ausentes Hoje</span>
                <span className="text-2xl font-bold text-gray-800">{kpis?.ausentes_hoje || 0}</span>
            </div>
        </div>

        <div className="kpi-card bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center">
            <div className="p-3 rounded-full bg-green-50 text-green-600 mr-4">
                <span className="material-symbols-outlined">attach_money</span>
            </div>
            <div>
                <span className="block text-gray-500 text-xs font-medium uppercase tracking-wider">Folha Estimada</span>
                <span className="text-2xl font-bold text-gray-800">
                    R$ {(kpis?.folha_pagamento || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
      </section>

      {/* --- SEÇÃO 3: GRÁFICOS OU TABELAS RECENTES (Placeholder) --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center py-12 text-gray-400">
         <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
         <p>Gráficos de desempenho e turnover virão aqui.</p>
      </div>

    </div>
  );
}

export default DashboardPage;