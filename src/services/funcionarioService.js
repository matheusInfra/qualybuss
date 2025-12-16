import { supabase } from './supabaseClient';
import { logAuditoria } from './auditService';

const BUCKET_NAME = 'avatars'; 

// --- UPLOAD DE ARQUIVOS ---
export const uploadAvatar = async (file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    return fileName;
  } catch (error) {
    console.error("Erro no upload do avatar:", error.message);
    throw error;
  }
};

export const getAvatarPublicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path; 
  if (path.startsWith('/api-supa')) return path;
  
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};

// --- CRUD DE FUNCIONÁRIOS ---

export const createFuncionario = async (dadosFuncionario) => {
  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    ...dadosFuncionario,
    status: 'Ativo',
    created_at: new Date(),
    created_by: user?.email || 'sistema'
  };

  const { data, error } = await supabase.from('funcionarios').insert([payload]).select().single();

  if (error) throw error;

  await logAuditoria({
    tabela: 'funcionarios',
    registroId: data.id,
    tipoAcao: 'INSERT',
    dadosNovos: data
  });

  return data;
};

// LISTAGEM PRINCIPAL
export const getFuncionarios = async ({ page = 1, limit = 10, search = '', status = 'Ativo' }) => {
  let query = supabase
    .from('funcionarios')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  if (status !== 'Todos') {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`nome_completo.ilike.%${search}%,cargo.ilike.%${search}%`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, count, error } = await query
    .order('nome_completo', { ascending: true })
    .range(from, to);

  if (error) throw error;
  
  return { data, count, totalPages: Math.ceil(count / limit) };
};

// LISTAGEM PARA DROPDOWNS
export const getFuncionariosDropdown = async () => {
  // CORREÇÃO: Removido 'jornada_id' da seleção
  const { data, error } = await supabase
    .from('funcionarios')
    .select('id, nome_completo, cargo, avatar_url, departamento, empresa_id, email_corporativo, qtd_dependentes, data_admissao, pis') 
    .eq('status', 'Ativo')
    .is('deleted_at', null)
    .order('nome_completo', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getFuncionarioById = async (id) => {
  const { data, error } = await supabase.from('funcionarios').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const updateFuncionario = async (id, dadosUpdate) => {
  const { data: antigo } = await supabase.from('funcionarios').select('*').eq('id', id).single();

  const { data, error } = await supabase
    .from('funcionarios')
    .update({ ...dadosUpdate, updated_at: new Date() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  const colunasAlteradas = Object.keys(dadosUpdate).filter(key =>
    JSON.stringify(antigo[key]) !== JSON.stringify(dadosUpdate[key])
  );

  if (colunasAlteradas.length > 0) {
    await logAuditoria({
      tabela: 'funcionarios',
      registroId: id,
      tipoAcao: 'UPDATE',
      dadosAntigos: antigo,
      dadosNovos: data,
      colunasAlteradas
    });
  }

  return data;
};

export const deleteFuncionario = async (id) => {
  const { data: antigo } = await supabase.from('funcionarios').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('funcionarios')
    .update({ deleted_at: new Date(), status: 'Arquivado' })
    .eq('id', id);

  if (error) throw error;

  await logAuditoria({
    tabela: 'funcionarios',
    registroId: id,
    tipoAcao: 'SOFT_DELETE',
    dadosAntigos: antigo
  });

  return true;
};

export const desligarFuncionario = async (id, dadosDesligamento) => {
  const { data: funcAtualizado, error: updateError } = await supabase
    .from('funcionarios')
    .update({ status: 'Inativo' })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  const { error: movError } = await supabase.from('movimentacoes').insert([{
    id_funcionario: id,
    data_movimentacao: dadosDesligamento.data_desligamento,
    tipo: 'Desligamento',
    descricao: `Colaborador desligado. Motivo: ${dadosDesligamento.motivo}`,
    cargo_novo: 'Desligado',
    salario_novo: 0
  }]);

  if (movError) console.error("Erro no histórico:", movError);
  return funcAtualizado;
};