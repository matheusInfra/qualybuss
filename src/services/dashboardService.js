// src/services/dashboardService.js
import { supabase } from './supabaseClient';

/**
 * Busca os 4 KPIs principais (Total, Pendentes, Ausentes, Folha)
 * Chama a função RPC 'get_dashboard_kpis' SEM parâmetros (modo global).
 * * IMPORTANTE: Certifique-se de ter rodado o SQL de reversão no banco
 * para que a função 'get_dashboard_kpis' não exija argumentos.
 */
export const getDashboardKPIs = async () => {
  const { data, error } = await supabase.rpc('get_dashboard_kpis');
  
  if (error) {
    console.error("Erro ao buscar KPIs do dashboard:", error.message);
    throw error;
  }
  // O RPC retorna um único objeto JSON
  return data;
};

/**
 * Busca os dados para o gráfico de pizza (Ausências por Tipo)
 * Chama a função RPC 'get_ausencias_por_tipo_90d' SEM parâmetros.
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
 * Busca as próximas férias aprovadas (Próximos 14 dias)
 * Consulta a tabela diretamente, sem filtrar por empresa_id.
 */
export const getProximasFerias = async () => {
  const hoje = new Date().toISOString();
  // Calcula a data para 14 dias no futuro
  const futuro = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select(`
      data_inicio,
      funcionario_id:funcionarios!inner ( nome_completo, avatar_url )
    `) 
    // REMOVIDO O FILTRO: .eq('empresa_id', empresaId)
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .gte('data_inicio', hoje)    // Data de início maior ou igual a hoje
    .lte('data_inicio', futuro)  // E menor ou igual a 14 dias
    .order('data_inicio', { ascending: true })
    .limit(5); // Pega apenas as 5 mais próximas

  if (error) {
    console.error("Erro ao buscar próximas férias:", error.message);
    throw error;
  }
  return data;
};