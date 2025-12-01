// src/services/funcionarioService.js
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
 * Busca todos os funcionários (com status para filtragem)
 */
export const getFuncionarios = async () => {
  const { data, error } = await supabase
    .from('funcionarios')
    // Trazemos o status para poder filtrar no front (Ativo/Inativo)
    .select('id, nome_completo, cargo, avatar_url, departamento, status, email_corporativo') 
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
 * [NOVO] Realiza o desligamento (Soft Delete).
 * Inativa o cadastro e cria um registro histórico, mantendo a integridade dos dados.
 */
export const desligarFuncionario = async (id, dadosDesligamento) => {
  // 1. Inativa o Funcionário
  const { data: funcAtualizado, error: updateError } = await supabase
    .from('funcionarios')
    .update({
      status: 'Inativo',
      // data_desligamento: dadosDesligamento.data_desligamento (se tiver a coluna)
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) throw updateError;

  // 2. Gera histórico de movimentação (Para auditoria e consulta futura)
  const { error: movError } = await supabase.from('movimentacoes').insert([{
    id_funcionario: id,
    data_movimentacao: dadosDesligamento.data_desligamento,
    tipo: 'Desligamento',
    descricao: `Colaborador desligado. Motivo: ${dadosDesligamento.motivo}`,
    cargo_anterior: funcAtualizado.cargo,
    cargo_novo: 'Desligado',
    salario_anterior: funcAtualizado.salario_bruto,
    salario_novo: 0
  }]);

  if (movError) console.error("Erro ao gerar histórico de desligamento:", movError);

  return funcAtualizado;
};

/**
 * Deleta fisicamente um funcionário (Cuidado: Apenas para erros de cadastro)
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

// Mantendo as funções de movimentação para compatibilidade
export const getMovimentacoesPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .eq('id_funcionario', funcionarioId)
    .order('data_movimentacao', { ascending: false });

  if (error) throw error;
  return data;
};

export const createMovimentacao = async (dadosMovimentacao) => {
  const { data, error } = await supabase.from('movimentacoes').insert([dadosMovimentacao]).select();
  if (error) throw error;
  return data[0];
};