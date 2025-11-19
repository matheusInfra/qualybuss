// src/services/dashboardService.js
import { supabase } from './supabaseClient';

/**
 * Busca os 4 KPIs principais (Total, Pendentes, Ausentes, Folha)
 * chamando a função RPC 'get_dashboard_kpis' que criamos no Supabase.
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
 * chamando a função RPC 'get_ausencias_por_tipo_90d'.
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
 * Esta função consulta a tabela diretamente.
 */
export const getProximasFerias = async () => {
  const hoje = new Date().toISOString();
  // Calcula a data para 14 dias no futuro
  const futuro = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select(`
      data_inicio,
      funcionario_id:funcionarios ( nome_completo, avatar_url )
    `) // Nota: 'funcionario_id' é a chave correta para esta tabela
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .gte('data_inicio', hoje)    // Data de início é maior ou igual a hoje
    .lte('data_inicio', futuro) // E menor ou igual a 14 dias
    .order('data_inicio', { ascending: true })
    .limit(5); // Pega apenas as 5 mais próximas

  if (error) {
    console.error("Erro ao buscar próximas férias:", error.message);
    throw error;
  }
  return data;
};

// Nota: A lista de "Últimas Movimentações" usará a função 
// 'getTodasMovimentacoes' que já existe no 'movimentacaoService.js'.