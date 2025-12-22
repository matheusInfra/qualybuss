import { supabase } from './supabaseClient';

// --- CRUD DE FUNCIONÁRIOS ---

export const getFuncionarios = async ({ 
  page = 1, 
  limit = 10, 
  search = '', 
  empresaId = null, 
  departamento = null, 
  status = null 
}) => {
  try {
    let query = supabase
      .from('funcionarios')
      .select('*', { count: 'exact' });

    // Filtros
    if (empresaId) query = query.eq('empresa_id', empresaId);
    if (departamento && departamento !== 'Todos') query = query.eq('departamento', departamento);
    if (status && status !== 'Todos') query = query.eq('status', status);
    
    // Busca Textual
    if (search) {
      query = query.or(`nome_completo.ilike.%${search}%,cargo.ilike.%${search}%`);
    }

    // Ordenação e Paginação
    query = query.order('nome_completo', { ascending: true });
    
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return { 
      data: data || [], 
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    };
  } catch (error) {
    console.error("Erro ao buscar funcionários:", error);
    throw error;
  }
};

export const getFuncionarioById = async (id) => {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data;
};

export const createFuncionario = async (funcionario) => {
  const { data, error } = await supabase
    .from('funcionarios')
    .insert([funcionario])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateFuncionario = async (id, updates) => {
  const { data, error } = await supabase
    .from('funcionarios')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// --- FUNÇÃO DE DESLIGAMENTO (CORREÇÃO DO ERRO) ---
export const desligarFuncionario = async (id, dadosDesligamento) => {
  // dadosDesligamento espera: { data_desligamento, motivo, observacoes, ... }
  const { data, error } = await supabase
    .from('funcionarios')
    .update({ 
      status: 'Desligado',
      ...dadosDesligamento 
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFuncionario = async (id) => {
  const { error } = await supabase
    .from('funcionarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// --- GESTÃO DE AVATAR ---

export const getAvatarPublicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
};

export const uploadAvatar = async (file, path) => {
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (error) throw error;
  return data.path;
};