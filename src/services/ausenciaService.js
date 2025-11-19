// src/services/ausenciaService.js
import { supabase } from './supabaseClient';

const ANEXOS_BUCKET = 'anexos_ausencias';

/**
 * Faz upload de um anexo
 */
export const uploadAnexoAusencia = async (file, funcionarioId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${funcionarioId}/${fileName}`;

  const { error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .upload(filePath, file);

  if (error) {
    console.error("Erro no upload do anexo:", error.message);
    throw error;
  }
  return filePath;
};

/**
 * Gera URL de download
 */
export const getAnexoAusenciaDownloadUrl = async (pathStorage) => {
  const { data, error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .createSignedUrl(pathStorage, 60);

  if (error) throw error;
  return data.signedUrl;
};

// --- CRUD AUSÊNCIAS (DÉBITOS) ---

export const createAusencia = async (dadosAusencia) => {
  const dadosFormatados = {
    ...dadosAusencia,
    motivo: dadosAusencia.motivo || null,
    anexo_path: dadosAusencia.anexo_path || null,
  };
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .insert([dadosFormatados])
    .select();

  if (error) throw error;
  return data[0];
};

export const getHistoricoAusencias = async () => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select('*')
    .order('data_inicio', { ascending: false });

  if (error) throw error;
  return data;
};

export const getAusenciaById = async (id) => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const updateAusencia = async (id, dadosUpdate) => {
  // Nota: Em um sistema real, você poderia impedir edição se status == 'Concluído' aqui também.
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .update(dadosUpdate)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

/**
 * (ATUALIZADA) Deleta uma ausência com TRAVA DE SEGURANÇA
 */
export const deleteAusencia = async (id, anexoPath) => {
  // 1. Verificação de Segurança
  const { data: item, error: fetchError } = await supabase
    .from('solicitacoes_ausencia')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  if (item && item.status === 'Concluído') {
    throw new Error("AÇÃO BLOQUEADA: Não é possível excluir um registro Concluído (Baixado). Para corrigir o saldo, faça um lançamento de ajuste (Crédito/Estorno).");
  }

  // 2. Segue fluxo normal de exclusão
  if (anexoPath) {
    try {
      await supabase.storage.from(ANEXOS_BUCKET).remove([anexoPath]);
    } catch (e) { console.error(e); }
  }

  const { error: dbError } = await supabase
    .from('solicitacoes_ausencia')
    .delete()
    .eq('id', id);

  if (dbError) throw dbError;
  return true;
};

// --- CRUD CRÉDITOS ---

export const createCreditoSaldo = async (dadosCredito) => {
  const { data, error } = await supabase
    .from('creditos_saldo')
    .insert([dadosCredito])
    .select();

  if (error) throw error;
  return data[0];
};

export const getHistoricoCreditos = async () => {
  const { data, error } = await supabase
    .from('creditos_saldo')
    .select('*')
    .order('data_lancamento', { ascending: false });

  if (error) throw error;
  return data;
};

export const getCreditoById = async (id) => {
  const { data, error } = await supabase
    .from('creditos_saldo')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

export const updateCredito = async (id, dadosUpdate) => {
  const { data, error } = await supabase
    .from('creditos_saldo')
    .update(dadosUpdate)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const deleteCredito = async (id) => {
  // (Opcional: Adicionar mesma trava de segurança aqui se desejar que créditos sejam imutáveis)
  const { error } = await supabase
    .from('creditos_saldo')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// --- FUNÇÕES ESPECIAIS (REGRA DE NEGÓCIO) ---

/**
 * (NOVA) Altera o status para 'Concluído', travando o registro.
 */
export const concluirSolicitacao = async (id, tabela = 'solicitacoes_ausencia') => {
  const { data, error } = await supabase
    .from(tabela)
    .update({ status: 'Concluído' })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

export const checkExistingFeriasNoAno = async (funcionarioId, ano) => {
  const dataInicioAno = new Date(ano, 0, 1).toISOString();
  const dataFimAno = new Date(ano, 11, 31).toISOString();

  const { error, count } = await supabase
    .from('solicitacoes_ausencia')
    .select('id', { count: 'exact' })
    .eq('funcionario_id', funcionarioId)
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .gte('data_inicio', dataInicioAno)
    .lte('data_inicio', dataFimAno);

  if (error) throw error;
  return count > 0;
};

export const getFeriasAprovadasParaCalendario = async (ano, mes, searchTerm = '', departamento = 'Todos') => {
  const dataInicioMes = new Date(ano, mes - 1, 1).toISOString();
  const dataFimMes = new Date(ano, mes, 0).toISOString();

  let query = supabase
    .from('solicitacoes_ausencia')
    .select(`
      id,
      data_inicio,
      data_fim,
      funcionario_id,
      funcionarios ( nome_completo, departamento )
    `)
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .or(
      `data_inicio.gte.${dataInicioMes},data_inicio.lte.${dataFimMes}`,
      `data_fim.gte.${dataInicioMes},data_fim.lte.${dataFimMes}`,
      `data_inicio.lt.${dataInicioMes},data_fim.gt.${dataFimMes}`
    );

  if (searchTerm) {
    query = query.ilike('funcionarios.nome_completo', `%${searchTerm}%`);
  }
  if (departamento && departamento !== 'Todos') {
    query = query.eq('funcionarios.departamento', departamento);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};