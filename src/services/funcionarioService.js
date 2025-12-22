import { supabase } from './supabaseClient';

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

    // Aplicação rigorosa de filtros
    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }
    
    if (departamento && departamento !== 'Todos') {
      query = query.eq('departamento', departamento);
    }
    
    if (status && status !== 'Todos') {
      query = query.eq('status', status);
    }
    
    // Busca textual (Nome ou Cargo)
    if (search) {
      query = query.or(`nome_completo.ilike.%${search}%,cargo.ilike.%${search}%`);
    }

    // Ordenação padrão
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
    console.error("Erro no serviço de funcionários:", error);
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

export const deleteFuncionario = async (id) => {
  const { error } = await supabase
    .from('funcionarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};