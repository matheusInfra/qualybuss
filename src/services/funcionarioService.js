import { supabase } from './supabaseClient';
import { logAuditoria } from './auditService'; // Certifique-se que este serviço existe

const BUCKET_NAME = 'avatars'; 

// --- UPLOAD DE ARQUIVOS ---
export const uploadAvatar = async (file) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Tenta fazer o upload
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;
    
    // Retorna a URL pública completa para salvar no banco
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return data.publicUrl;
  } catch (error) {
    console.error("Erro no upload do avatar:", error.message);
    throw error;
  }
};

export const getAvatarPublicUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path; 
  return path;
};

// --- LEITURA DE DADOS ---

export const getFuncionarios = async ({ page = 1, limit = 10, search = '', status = 'Ativo', empresaId = null } = {}) => {
  let query = supabase
    .from('funcionarios')
    .select('*', { count: 'exact' });

  // Filtro de Status (suporta 'Todos' para ignorar o filtro, exceto excluídos)
  if (status !== 'Todos') {
    if (status === 'Inativo') {
      query = query.in('status', ['Desligado', 'Afastado', 'Inativo']);
    } else {
      query = query.eq('status', status);
    }
  } else {
    // Mesmo em 'Todos', não mostramos os 'Arquivado' (Soft Delete)
    query = query.neq('status', 'Arquivado');
  }

  // Filtro de Busca (Nome ou Cargo)
  if (search) {
    query = query.or(`nome_completo.ilike.%${search}%,cargo.ilike.%${search}%`);
  }

  // Filtro de Empresa
  if (empresaId) {
    query = query.eq('empresa_id', empresaId);
  }

  // Paginação
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('nome_completo', { ascending: true })
    .range(from, to);

  if (error) throw error;

  return {
    data,
    count,
    totalPages: Math.ceil(count / limit)
  };
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

export const getFuncionariosDropdown = async (empresaId) => {
  let query = supabase
    .from('funcionarios')
    .select('id, nome_completo')
    .neq('status', 'Arquivado') // Não trazer excluídos
    .eq('status', 'Ativo') // Opcional: trazer apenas ativos para dropdowns
    .order('nome_completo');

  if (empresaId) {
    query = query.eq('empresa_id', empresaId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao carregar dropdown:", error);
    return [];
  }
  return data;
};

// --- ESCRITA DE DADOS (COM AUDITORIA) ---

export const createFuncionario = async (dadosFuncionario) => {
  // Remove campos vazios ou undefined para evitar erros no banco
  const payload = Object.fromEntries(
    Object.entries(dadosFuncionario).filter(([_, v]) => v != null && v !== '')
  );

  const { data, error } = await supabase
    .from('funcionarios')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  // Log de Auditoria
  try {
    await logAuditoria({
      tabela: 'funcionarios',
      registroId: data.id,
      tipoAcao: 'INSERT',
      dadosNovos: data
    });
  } catch (auditErr) {
    console.warn("Falha ao registrar auditoria (create):", auditErr);
  }

  return data; // Retorna objeto único, compatível com o novo form
};

export const updateFuncionario = async (id, dadosUpdate) => {
  // Busca dados antigos para comparação
  const { data: antigo } = await supabase.from('funcionarios').select('*').eq('id', id).single();

  const { data, error } = await supabase
    .from('funcionarios')
    .update(dadosUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Calcula diferenças para auditoria
  const colunasAlteradas = Object.keys(dadosUpdate).filter(
    key => JSON.stringify(antigo[key]) !== JSON.stringify(dadosUpdate[key])
  );

  if (colunasAlteradas.length > 0) {
    try {
      await logAuditoria({
        tabela: 'funcionarios',
        registroId: id,
        tipoAcao: 'UPDATE',
        dadosAntigos: antigo,
        dadosNovos: data,
        colunasAlteradas
      });
    } catch (auditErr) {
      console.warn("Falha ao registrar auditoria (update):", auditErr);
    }
  }

  return data;
};

export const deleteFuncionario = async (id) => {
  // Soft Delete: Apenas marca como Arquivado/Deletado
  const { data: antigo } = await supabase.from('funcionarios').select('*').eq('id', id).single();

  const { error } = await supabase
    .from('funcionarios')
    .update({ 
      deleted_at: new Date(), 
      status: 'Arquivado' 
    })
    .eq('id', id);

  if (error) throw error;

  try {
    await logAuditoria({
      tabela: 'funcionarios',
      registroId: id,
      tipoAcao: 'SOFT_DELETE',
      dadosAntigos: antigo
    });
  } catch (auditErr) {
    console.warn("Falha auditoria delete:", auditErr);
  }

  return true;
};

export const desligarFuncionario = async (id, dadosDesligamento) => {
  // Atualiza status e data de desligamento
  const updateData = {
    status: 'Desligado',
    data_desligamento: dadosDesligamento.data || new Date()
  };

  const { data, error } = await supabase
    .from('funcionarios')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  try {
    await logAuditoria({
      tabela: 'funcionarios',
      registroId: id,
      tipoAcao: 'DESLIGAMENTO',
      dadosNovos: { ...updateData, motivo: dadosDesligamento.motivo }
    });
  } catch (e) { console.warn(e); }

  return data;
};