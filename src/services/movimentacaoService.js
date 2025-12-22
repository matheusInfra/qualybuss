import { supabase } from './supabaseClient';

/**
 * Lista movimentações (Histórico)
 * Suporta filtro por Empresa (Dashboard) ou Funcionário (Perfil)
 */
export const getMovimentacoes = async (empresaId = null) => {
  let query = supabase
    .from('movimentacoes')
    .select(`
      *,
      funcionario:funcionarios ( id, nome_completo, departamento )
    `)
    .order('data_movimentacao', { ascending: false });

  if (empresaId) {
    // Se a tabela movimentacoes não tiver empresa_id direto, filtramos via join (opcional), 
    // mas aqui assumo que você tem a coluna ou quer filtrar pelo contexto.
    // Se não tiver a coluna 'empresa_id' na tabela movimentacoes, remova a linha abaixo.
    query = query.eq('empresa_id', empresaId); 
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar movimentações:", error);
    throw error;
  }
  return data;
};

/**
 * Cria uma nova movimentação
 * Tenta usar a função segura (RPC) primeiro, se falhar, tenta insert direto.
 */
export const criarMovimentacao = async (dados) => {
  try {
    // 1. Tenta via RPC (Segurança/Compliance)
    const payloadRPC = {
      p_funcionario_id: dados.funcionario_id,
      p_tipo: dados.tipo,
      p_data: dados.data_movimentacao,
      p_descricao: dados.descricao,
      p_salario_novo: dados.valor ? parseFloat(dados.valor) : null
      // Adicione outros campos se sua RPC exigir
    };
    
    const { data, error } = await supabase.rpc('registrar_movimentacao_segura', payloadRPC);
    if (!error) return data;
    
    // Se der erro de "function not found", cai no catch ou no if abaixo
    if (error && error.code !== '42883') throw error; // 42883 = func undefined
  } catch (e) {
    // console.warn("RPC não encontrada ou falha, tentando INSERT direto...", e);
  }

  // 2. Fallback: Insert Direto (Caso a RPC não esteja configurada no banco ainda)
  const { data, error } = await supabase
    .from('movimentacoes')
    .insert([{
      funcionario_id: dados.funcionario_id,
      empresa_id: dados.empresa_id,
      tipo_movimentacao: dados.tipo, // Ajuste para o nome exato da sua coluna (tipo ou tipo_movimentacao)
      data_movimentacao: dados.data_movimentacao,
      valor: dados.valor,
      motivo: dados.descricao,
      created_at: new Date()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Exclui uma movimentação
 */
export const excluirMovimentacao = async (id) => {
  const { error } = await supabase
    .from('movimentacoes')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

/**
 * Busca movimentações de um funcionário específico
 */
export const getMovimentacoesPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .eq('funcionario_id', funcionarioId) // Verifique se é id_funcionario ou funcionario_id
    .order('data_movimentacao', { ascending: false });

  if (error) throw error;
  return data;
};