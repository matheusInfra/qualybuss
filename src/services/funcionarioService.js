import { supabase } from './supabaseClient';

const BUCKET_NAME = 'avatares';

/**
 * Faz o upload de uma imagem de avatar
 * @param {File} file - O arquivo da imagem
 * @returns {String} - O path do arquivo no storage
 */
export const uploadAvatar = async (file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (error) {
    console.error("Erro no upload do avatar:", error.message);
    throw error;
  }

  return filePath;
};

/**
 * Pega a URL pública de um avatar
 * @param {String} path - O path do arquivo (retornado pelo uploadAvatar)
 * @returns {String} - A URL pública
 */
export const getAvatarPublicUrl = (path) => {
  if (!path) return null;
  
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return data.publicUrl;
};

// --- FUNÇÕES CRUD ---

/**
 * Cria um novo funcionário
 */
export const createFuncionario = async (dadosFuncionario) => {
  const { data, error } = await supabase
    .from('funcionarios')
    .insert([dadosFuncionario])
    .select();
  
  if (error) {
    console.error("Erro ao criar funcionário:", error.message);
    throw error;
  }
  return data[0];
};

/**
 * Busca todos os funcionários (apenas dados para o mural)
 */
export const getFuncionarios = async () => {
  const { data, error } = await supabase
    .from('funcionarios')
    // --- MODIFICAÇÃO AQUI ---
    .select('id, nome_completo, cargo, avatar_url, departamento') 
    .order('nome_completo', { ascending: true });

  if (error) {
    console.error("Erro ao buscar funcionários:", error.message);
    throw error;
  }
  return data;
};

/**
 * Busca um funcionário específico pelo ID (todos os dados)
 */
export const getFuncionarioById = async (id) => {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Erro ao buscar funcionário:", error.message);
    throw error;
  }
  return data;
};

/**
 * Atualiza um funcionário
 */
export const updateFuncionario = async (id, dadosUpdate) => {
  const { data, error } = await supabase
    .from('funcionarios')
    .update(dadosUpdate)
    .eq('id', id)
    .select();
  
  if (error) {
    console.error("Erro ao atualizar funcionário:", error.message);
    throw error;
  }
  return data[0];
};

/**
 * Deleta um funcionário
 */
export const deleteFuncionario = async (id) => {
  const { error } = await supabase
    .from('funcionarios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Erro ao deletar funcionário:", error.message);
    throw error;
  }
  return true;
};

// ... (mantenha todo o seu código existente, como deleteFuncionario, etc.)

/**
 * (NOVA FUNÇÃO) Busca o histórico de movimentações (promoção, salário)
 * de um funcionário específico.
 */
export const getMovimentacoesPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('movimentacoes') // <-- Nome da sua tabela
    .select('*') // Pega tudo
    .eq('funcionario_id', funcionarioId) // Filtra pelo funcionário
    .order('data_movimentacao', { ascending: false }); // Mais novas primeiro

  if (error) {
    console.error("Erro ao buscar movimentações:", error.message);
    throw error;
  }
  return data;
};

/**
 * (NOVA FUNÇÃO) Cria um novo registro de movimentação
 */
export const createMovimentacao = async (dadosMovimentacao) => {
  const { data, error } = await supabase
    .from('movimentacoes')
    .insert([dadosMovimentacao])
    .select();
  
  if (error) {
    console.error("Erro ao criar movimentação:", error.message);
    throw error;
  }
  return data[0];
};