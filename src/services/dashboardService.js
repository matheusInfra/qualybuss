// src/services/dashboardService.js
import { supabase } from './supabaseClient';

export const getDashboardKPIs = async () => {
  const { data, error } = await supabase.rpc('get_dashboard_kpis');
  if (error) {
    console.error("Erro KPIs:", error.message);
    throw error;
  }
  return data;
};

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

  if (error) throw error;
  return data;
};

export const getAniversariantesMes = async () => {
  const { data, error } = await supabase.rpc('get_aniversariantes_mes'); 
  if (error) throw error;
  return data;
};

/**
 * [NOVO] Busca o histórico de KPIs para os gráficos (Últimos 6 meses)
 */
export const getHistoricoKPIs = async () => {
  const { data, error } = await supabase
    .from('historico_kpis')
    .select('data_referencia, total_colaboradores, total_folha')
    .order('data_referencia', { ascending: true }) // Do mais antigo para o novo
    .limit(30); // Últimos 30 registros (dias)

  if (error) {
    console.error("Erro histórico:", error.message);
    return []; // Retorna vazio para não quebrar tela
  }
  return data;
};