// src/services/ausenciaService.js
import { supabase } from './supabaseClient';

const ANEXOS_BUCKET = 'anexos_ausencias';

// --- UPLOAD E DOWNLOAD ---

export const uploadAnexoAusencia = async (file, funcionarioId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${funcionarioId}/${fileName}`;

  const { error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .upload(filePath, file);

  if (error) throw error;
  return filePath;
};

export const getAnexoAusenciaDownloadUrl = async (pathStorage) => {
  const { data, error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .createSignedUrl(pathStorage, 60);

  if (error) throw error;
  return data.signedUrl;
};

// --- GESTÃO DE PERÍODOS (SALDO DE FÉRIAS) ---

/**
 * Busca todos os períodos aquisitivos de um funcionário.
 * Ordenado do mais antigo para o mais novo para lógica FIFO (First-In, First-Out).
 */
export const getPeriodosAquisitivos = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('periodos_aquisitivos')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('inicio_periodo', { ascending: true });

  if (error) throw error;
  return data;
};

/**
 * Atualiza manualmente um período (usado na tela de Ajuste de Saldos).
 */
export const updatePeriodoAquisitivo = async (id, dados) => {
  const { data, error } = await supabase
    .from('periodos_aquisitivos')
    .update(dados)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

// --- VALIDAÇÕES E SOLICITAÇÕES ---

/**
 * Verifica se existe conflito de datas para o funcionário.
 * Retorna TRUE se já houver uma solicitação (não rejeitada) no intervalo.
 */
export const checkConflitoDatas = async (funcionarioId, dataInicio, dataFim, ignoreId = null) => {
  let query = supabase
    .from('solicitacoes_ausencia')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .neq('status', 'Rejeitado') // Ignora as rejeitadas, elas não bloqueiam agenda
    // Lógica de sobreposição: (InicioA <= FimB) e (FimA >= InicioB)
    .or(`data_inicio.lte.${dataFim},data_fim.gte.${dataInicio}`);

  if (ignoreId) {
    query = query.neq('id', ignoreId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data.length > 0;
};

/**
 * Cria uma nova solicitação de ausência.
 */
export const createSolicitacaoAusencia = async (dados) => {
  // 1. Validação de Conflito no Backend (Segurança extra)
  const temConflito = await checkConflitoDatas(dados.funcionario_id, dados.data_inicio, dados.data_fim);
  if (temConflito) {
    throw new Error("Conflito detectado: Já existe uma ausência registrada neste período.");
  }

  // 2. Prepara o objeto
  const payload = {
    funcionario_id: dados.funcionario_id,
    empresa_id: dados.empresa_id,
    tipo: dados.tipo,
    categoria: dados.categoria, // 'Ferias', 'Saude', 'Pessoal', etc.
    data_inicio: dados.data_inicio,
    data_fim: dados.data_fim,
    motivo: dados.motivo || null,
    anexo_path: dados.anexo_path || null,
    status: 'Pendente',
    periodo_aquisitivo_id: dados.periodo_aquisitivo_id || null,
    quantidade: dados.quantidade || 0,
    unidade: 'dias'
  };

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .insert([payload])
    .select();

  if (error) throw error;
  return data[0];
};

/**
 * Busca TODAS as solicitações (Visão Global / Single-Tenant).
 */
export const getTodasSolicitacoes = async () => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select(`
      *,
      funcionarios ( id, nome_completo, avatar_url, cargo )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateStatusSolicitacao = async (id, status, motivoRejeicao = null) => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .update({ 
      status: status, 
      motivo: motivoRejeicao ? motivoRejeicao : undefined 
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteSolicitacao = async (id) => {
  const { error } = await supabase
    .from('solicitacoes_ausencia')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};