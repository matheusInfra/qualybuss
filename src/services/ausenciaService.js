// src/services/ausenciaService.js
import { supabase } from './supabaseClient';

const ANEXOS_BUCKET = 'anexos_ausencias';

// --- 1. UPLOAD E ARQUIVOS ---
export const uploadAnexoAusencia = async (file, funcionarioId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${funcionarioId}/${fileName}`;
  const { error } = await supabase.storage.from(ANEXOS_BUCKET).upload(filePath, file);
  if (error) throw error;
  return filePath;
};

export const getAnexoAusenciaDownloadUrl = async (pathStorage) => {
  const { data, error } = await supabase.storage.from(ANEXOS_BUCKET).createSignedUrl(pathStorage, 60);
  if (error) throw error;
  return data.signedUrl;
};

// --- 2. CRIAÇÃO E LANÇAMENTO (Débitos e Créditos) ---

// Lançar Ausência (Débito)
export const createAusencia = async (dados) => {
  // Verifica conflito apenas se for férias/folga
  if (['Férias', 'Folga Pessoal'].includes(dados.tipo)) {
    const temConflito = await checkConflitoDatas(dados.funcionario_id, dados.data_inicio, dados.data_fim);
    if (temConflito) throw new Error("Já existe uma ausência registrada neste período.");
  }

  const { data, error } = await supabase.from('solicitacoes_ausencia').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

// Lançar Crédito (Banco de Horas / Direito de Férias Extra)
export const createCreditoSaldo = async (dados) => {
  const { data, error } = await supabase.from('historico_creditos').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

// --- 3. BUSCAS OTIMIZADAS (Mural e Histórico) ---

/**
 * Busca OTIMIZADA para o Mural Inicial.
 * Traz apenas registros de 30 dias atrás até 30 dias no futuro.
 * Leve e rápido para carregamento inicial.
 */
export const getMuralRecente = async () => {
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje); trintaDiasAtras.setDate(hoje.getDate() - 30);
  const trintaDiasFrente = new Date(hoje); trintaDiasFrente.setDate(hoje.getDate() + 30);

  // Busca Ausências (Débitos) na janela
  const { data: ausencias } = await supabase
    .from('solicitacoes_ausencia')
    .select('*, funcionarios(nome_completo, avatar_url, cargo)')
    .gte('data_inicio', trintaDiasAtras.toISOString())
    .lte('data_inicio', trintaDiasFrente.toISOString())
    .order('created_at', { ascending: false });

  // Busca Créditos na janela
  const { data: creditos } = await supabase
    .from('historico_creditos')
    .select('*, funcionarios(nome_completo, avatar_url, cargo)')
    .gte('data_lancamento', trintaDiasAtras.toISOString())
    .lte('data_lancamento', trintaDiasFrente.toISOString())
    .order('created_at', { ascending: false });

  return { ausencias: ausencias || [], creditos: creditos || [] };
};

/**
 * Busca AVANÇADA para a aba Histórico/Extrato.
 * Permite filtrar por colaborador e intervalo de datas.
 */
export const getExtratoFiltrado = async ({ funcionarioId, dataInicio, dataFim }) => {
  let queryAusencia = supabase
    .from('solicitacoes_ausencia')
    .select('*, funcionarios(nome_completo, avatar_url)')
    .order('data_inicio', { ascending: false });

  let queryCredito = supabase
    .from('historico_creditos')
    .select('*, funcionarios(nome_completo, avatar_url)')
    .order('data_lancamento', { ascending: false });

  if (funcionarioId) {
    queryAusencia = queryAusencia.eq('funcionario_id', funcionarioId);
    queryCredito = queryCredito.eq('funcionario_id', funcionarioId);
  }
  if (dataInicio) {
    queryAusencia = queryAusencia.gte('data_inicio', dataInicio);
    queryCredito = queryCredito.gte('data_lancamento', dataInicio);
  }
  if (dataFim) {
    queryAusencia = queryAusencia.lte('data_inicio', dataFim);
    queryCredito = queryCredito.lte('data_lancamento', dataFim);
  }

  const [resA, resC] = await Promise.all([queryAusencia, queryCredito]);
  
  if (resA.error) throw resA.error;
  if (resC.error) throw resC.error;

  return { ausencias: resA.data, creditos: resC.data };
};

// --- 4. GESTÃO SEGURA (Update/Delete com Travas) ---

export const updateStatusSolicitacao = async (id, status) => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .update({ status }) // Apenas status
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

/**
 * TRAVA DE SEGURANÇA: Só permite excluir se for PENDENTE.
 * Registros oficiais não podem ser apagados para manter auditoria.
 */
export const deleteAusenciaSegura = async (id) => {
  // 1. Verifica o status atual antes de deletar
  const { data: atual } = await supabase
    .from('solicitacoes_ausencia')
    .select('status, anexo_path')
    .eq('id', id)
    .single();

  if (!atual) throw new Error("Registro não encontrado.");

  if (atual.status !== 'Pendente') {
    throw new Error("SEGURANÇA: Não é permitido excluir registros já Aprovados, Rejeitados ou Concluídos. Realize um lançamento de ajuste/estorno se necessário.");
  }

  // 2. Se tiver anexo, deleta
  if (atual.anexo_path) {
    await supabase.storage.from(ANEXOS_BUCKET).remove([atual.anexo_path]);
  }

  // 3. Deleta o registro
  const { error } = await supabase.from('solicitacoes_ausencia').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Créditos entram direto como efetivados, então em tese não deveriam ser apagados.
// Mas se foi erro de digitação imediato (criado hoje), podemos permitir (regra flexível).
export const deleteCreditoSeguro = async (id) => {
  // Regra: Só pode deletar crédito se foi criado nas últimas 24h (erro de digitação)
  const ontem = new Date(); ontem.setHours(ontem.getHours() - 24);
  
  const { data: atual } = await supabase
    .from('historico_creditos')
    .select('created_at')
    .eq('id', id)
    .single();

  if (!atual) throw new Error("Crédito não encontrado.");
  
  if (new Date(atual.created_at) < ontem) {
    throw new Error("AUDITORIA: Créditos antigos não podem ser excluídos. Faça um lançamento de débito para corrigir o saldo.");
  }

  const { error } = await supabase.from('historico_creditos').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Auxiliares
export const getAusenciaById = async (id) => {
  const { data, error } = await supabase.from('solicitacoes_ausencia').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};
export const getCreditoById = async (id) => {
  const { data, error } = await supabase.from('historico_creditos').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};
export const updateAusencia = async (id, dados) => {
  // Também bloqueia edição de aprovados
  const { data: atual } = await supabase.from('solicitacoes_ausencia').select('status').eq('id', id).single();
  if (atual.status !== 'Pendente') throw new Error("Apenas solicitações pendentes podem ser editadas.");

  const { data, error } = await supabase.from('solicitacoes_ausencia').update(dados).eq('id', id).select();
  if (error) throw error;
  return data[0];
};
export const updateCredito = async (id, dados) => {
  const { data, error } = await supabase.from('historico_creditos').update(dados).eq('id', id).select();
  if (error) throw error;
  return data[0];
};
export const checkConflitoDatas = async (funcionarioId, dataInicio, dataFim) => {
  const { data } = await supabase
    .from('solicitacoes_ausencia')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .neq('status', 'Rejeitado')
    .or(`data_inicio.lte.${dataFim},data_fim.gte.${dataInicio}`);
  return data?.length > 0;
};
export const checkExistingFeriasNoAno = async (funcionarioId, ano) => {
  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-31`;
  const { data } = await supabase
    .from('solicitacoes_ausencia')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .eq('tipo', 'Férias')
    .neq('status', 'Rejeitado')
    .gte('data_inicio', inicioAno)
    .lte('data_inicio', fimAno);
  return data?.length > 0;
};
// Mantido para compatibilidade com ModalExtrato antigo, mas o ideal é migrar para getExtratoFiltrado
export const getHistoricoAusencias = async () => { 
  const { data } = await supabase.from('solicitacoes_ausencia').select('*'); 
  return data; 
};
export const getHistoricoCreditos = async () => { 
  const { data } = await supabase.from('historico_creditos').select('*'); 
  return data; 
};
export const concluirSolicitacao = async (id) => updateStatusSolicitacao(id, 'Concluído');