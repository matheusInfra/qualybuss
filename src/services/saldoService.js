import { supabase } from './supabaseClient';

/**
 * Busca os saldos já calculados pelo banco de dados.
 * Muito mais rápido e escalável que fazer no front-end.
 */
export const getSaldosConsolidados = async () => {
  // A view retorna uma linha por tipo de saldo por funcionário.
  // Vamos buscar e depois agrupar no front apenas para exibição.
  const { data, error } = await supabase
    .from('view_saldos_funcionarios')
    .select('*')
    .order('nome_completo');

  if (error) {
    console.error("Erro ao buscar saldos:", error.message);
    throw error;
  }
  return data;
};