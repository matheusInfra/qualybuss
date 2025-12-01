// src/services/dashboardService.js
import { supabase } from './supabaseClient';

/**
 * Busca os 4 KPIs principais (Total, Pendentes, Ausentes, Folha).
 * A RPC 'get_dashboard_kpis' também salva o histórico do dia automaticamente.
 */
export const getDashboardKPIs = async () => {
  const { data, error } = await supabase.rpc('get_dashboard_kpis');
  
  if (error) {
    console.error("Erro ao buscar KPIs do dashboard:", error.message);
    throw error;
  }
  return data;
};

/**
 * [NOVO] Busca o histórico de KPIs para os gráficos (Últimos 30 dias).
 * Permite visualizar a evolução da folha e do quadro de funcionários.
 */
export const getHistoricoKPIs = async () => {
  const { data, error } = await supabase
    .from('historico_kpis')
    .select('data_referencia, total_colaboradores, total_folha')
    .order('data_referencia', { ascending: true }) 
    .limit(30);

  if (error) {
    // Retorna vazio se a tabela ainda não tiver dados ou der erro, para não quebrar a tela
    console.warn("Histórico indisponível (pode ser a primeira execução):", error.message);
    return [];
  }
  return data;
};

/**
 * Busca os dados para o gráfico de pizza (Ausências por Tipo).
 */
export const getAusenciasPorTipo = async () => {
  const { data, error } = await supabase.rpc('get_ausencias_por_tipo_90d');

  if (error) {
    console.error("Erro ao buscar dados do gráfico de ausências:", error.message);
    throw error;
  }
  return data;
};

/**
 * Busca as próximas férias aprovadas.
 */
export const getProximasFerias = async () => {
  const hoje = new Date().toISOString();
  const futuro = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select(`
      data_inicio,
      funcionario_id:funcionarios!inner ( nome_completo, avatar_url )
    `) 
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .gte('data_inicio', hoje)
    .lte('data_inicio', futuro)
    .order('data_inicio', { ascending: true })
    .limit(5);

  if (error) {
    console.error("Erro ao buscar próximas férias:", error.message);
    throw error;
  }
  return data;
};

export const getAniversariantesMes = async () => {
  const { data, error } = await supabase
    .rpc('get_aniversariantes_mes'); 
  
  if (error) throw error;
  return data;
};