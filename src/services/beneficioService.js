import { supabase } from './supabaseClient';

// === GESTÃO DE VÍNCULOS (FUNCIONÁRIO <-> BENEFÍCIO) ===

export const getBeneficiosEmLote = async (funcionarioIds) => {
  const { data, error } = await supabase
    .from('beneficios_funcionario')
    .select('*')
    .in('funcionario_id', funcionarioIds);

  if (error) {
    console.error('Erro ao buscar benefícios:', error);
    return [];
  }
  return data;
};

export const getBeneficiosByFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('beneficios_funcionario')
    .select('*')
    .eq('funcionario_id', funcionarioId);

  if (error) throw error;
  return data;
};

export const saveBeneficios = async (beneficio) => {
  const { id, ...payload } = beneficio;
  
  if (id && !String(id).startsWith('temp')) {
    // Atualizar
    const { data, error } = await supabase
      .from('beneficios_funcionario')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  } else {
    // Criar
    const { data, error } = await supabase
      .from('beneficios_funcionario')
      .insert([payload])
      .select();
    if (error) throw error;
    return data[0];
  }
};

export const deleteBeneficio = async (id) => {
  const { error } = await supabase
    .from('beneficios_funcionario')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

// === GESTÃO DO CATÁLOGO GERAL DE BENEFÍCIOS ===
// Estas eram as funções que estavam faltando

export const listarCatalogo = async () => {
  // Supondo tabela 'catalogo_beneficios' ou similar. 
  // Se não tiver tabela separada, pode usar uma query distinct ou tabela de tipos.
  const { data, error } = await supabase
    .from('catalogo_beneficios') 
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    // Se a tabela não existir, retorna array vazio para não quebrar a tela
    if (error.code === '42P01') return []; 
    throw error;
  }
  return data;
};

export const criarItemCatalogo = async (item) => {
  const { data, error } = await supabase
    .from('catalogo_beneficios')
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const atualizarItemCatalogo = async (id, item) => {
  const { data, error } = await supabase
    .from('catalogo_beneficios')
    .update(item)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const excluirItemCatalogo = async (id) => {
  const { error } = await supabase
    .from('catalogo_beneficios')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// Export Default Unificado
export default {
  // Vínculos
  getBeneficiosEmLote,
  getBeneficiosByFuncionario,
  saveBeneficios,
  deleteBeneficio,
  // Catálogo
  listarCatalogo,
  criarItemCatalogo,
  atualizarItemCatalogo,
  excluirItemCatalogo
};