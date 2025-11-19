import { supabase } from './supabaseClient';

// --- EMPRESAS ---

export const getEmpresas = async () => {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .order('nome_fantasia');
  if (error) throw error;
  return data;
};

export const getEmpresaById = async (id) => {
  const { data, error } = await supabase
    .from('empresas')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
};

export const createEmpresa = async (dados) => {
  const { data, error } = await supabase
    .from('empresas')
    .insert([dados])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateEmpresa = async (id, dados) => {
  const { data, error } = await supabase
    .from('empresas')
    .update(dados)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

export const deleteEmpresa = async (id) => {
  const { error } = await supabase
    .from('empresas')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};