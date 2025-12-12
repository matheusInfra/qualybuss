import { supabase } from './supabaseClient';

// --- CATÁLOGO DE BENEFÍCIOS ---

export const getTiposBeneficios = async () => {
  const { data, error } = await supabase
    .from('beneficios_tipos')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
};

export const createTipoBeneficio = async (dados) => {
  const { data, error } = await supabase.from('beneficios_tipos').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

export const deleteTipoBeneficio = async (id) => {
  const { error } = await supabase.from('beneficios_tipos').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// --- VÍNCULOS COM FUNCIONÁRIOS ---

export const getBeneficiosFuncionarios = async () => {
  // Busca todos os vínculos, trazendo os detalhes do tipo (Join)
  const { data, error } = await supabase
    .from('funcionarios_beneficios')
    .select(`
      *,
      beneficios_tipos ( nome, operacao, tipo_valor )
    `);
  if (error) throw error;
  return data;
};

export const vincularBeneficio = async (dados) => {
  const { data, error } = await supabase.from('funcionarios_beneficios').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

export const removerVinculoBeneficio = async (id) => {
  const { error } = await supabase.from('funcionarios_beneficios').delete().eq('id', id);
  if (error) throw error;
  return true;
};