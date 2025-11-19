// src/services/movimentacaoService.js
import { supabase } from './supabaseClient';

/**
 * Busca o histórico de movimentações (promoção, salário)
 * de um funcionário específico.
 */
export const getMovimentacoesPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .eq('id_funcionario', funcionarioId) // <-- CORRIGIDO
    .order('data_movimentacao', { ascending: false });

  if (error) {
    console.error("Erro ao buscar movimentações:", error.message);
    throw error;
  }
  return data;
};

/**
 * Busca TODAS as movimentações recentes (com join)
 */
export const getTodasMovimentacoes = async () => {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(`
      id,
      data_movimentacao,
      tipo,
      descricao,
      cargo_anterior,
      cargo_novo,
      salario_anterior,
      salario_novo,
      id_funcionario:funcionarios ( nome_completo, avatar_url ) 
    `) // <-- SINTAXE DO JOIN CORRIGIDA
    .order('data_movimentacao', { ascending: false })
    .limit(50);

  if (error) {
    console.error("Erro ao buscar todas as movimentações:", error.message);
    throw error;
  }
  return data;
};

/**
 * Cria um novo registro de movimentação
 */
export const createMovimentacao = async (dadosMovimentacao) => {
  // Garante que o nome da coluna está correto
  const dadosCorrigidos = {
    ...dadosMovimentacao,
    id_funcionario: dadosMovimentacao.id_funcionario, // <-- CORRIGIDO
  };

  const { data, error } = await supabase
    .from('movimentacoes')
    .insert([dadosCorrigidos])
    .select();
  
  if (error) {
    console.error("Erro ao criar movimentação:", error.message);
    throw error;
  }
  return data[0];
};