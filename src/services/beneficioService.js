import { supabase } from './supabaseClient';

export const getBeneficiosPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('beneficios_colaborador')
    .select('*')
    .eq('funcionario_id', funcionarioId);
  
  if (error) throw error;
  return data;
};

// Busca otimizada para carregar benefícios de vários funcionários de uma vez
export const getBeneficiosEmLote = async (listaIds) => {
  if (!listaIds || listaIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('beneficios_colaborador')
    .select('*')
    .in('funcionario_id', listaIds);
    
  if (error) throw error;
  return data;
};

export const criarBeneficio = async (dados) => {
  const { data, error } = await supabase
    .from('beneficios_colaborador')
    .insert([dados])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deletarBeneficio = async (id) => {
  const { error } = await supabase
    .from('beneficios_colaborador')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
  return true;
};