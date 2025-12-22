import { supabase } from './supabaseClient';

// --- LEITURA E LISTAGEM ---

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

    // Ordenação
    query = query.order('nome_completo', { ascending: true });
    
    // Paginação
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

// Função Leve para Dropdowns (CORREÇÃO DO ERRO)
export const getFuncionariosDropdown = async (empresaId) => {
  if (!empresaId) return [];
  
  const { data, error } = await supabase
    .from('funcionarios')
    .select('id, nome_completo, cargo, departamento')
    .eq('empresa_id', empresaId)
    .eq('status', 'Ativo')
    .order('nome_completo');

  if (error) throw error;
  return data;
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

// --- ESCRITA E ATUALIZAÇÃO ---

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

export const desligarFuncionario = async (id, dadosDesligamento) => {
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

// --- ARQUIVOS / IMAGENS ---

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