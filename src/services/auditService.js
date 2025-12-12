import { supabase } from './supabaseClient';

export const logAuditoria = async ({ tabela, registroId, tipoAcao, dadosAntigos, dadosNovos, colunasAlteradas }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('logs_auditoria').insert([{
      tabela,
      registro_id: registroId,
      tipo_acao: tipoAcao,
      dados_antigos: dadosAntigos,
      dados_novos: dadosNovos,
      colunas_alteradas: colunasAlteradas,
      usuario_email: user?.email || 'sistema'
    }]);
  } catch (error) {
    console.error("Falha ao registrar auditoria (não crítico):", error);
    // Não lança erro para não bloquear a operação principal
  }
};

export const getLogs = async (limit = 20) => {
  const { data, error } = await supabase
    .from('logs_auditoria')
    .select('*')
    .order('data_acao', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};