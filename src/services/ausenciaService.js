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
  if (['Férias', 'Folga Pessoal'].includes(dados.tipo)) {
    const temConflito = await checkConflitoDatas(dados.funcionario_id, dados.data_inicio, dados.data_fim);
    if (temConflito) throw new Error("Já existe uma ausência registrada neste período.");
  }
  const { data, error } = await supabase.from('solicitacoes_ausencia').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

// Lançar Crédito (INTELIGENTE: Direciona para a tabela correta)
export const createCreditoSaldo = async (dados) => {
  // LÓGICA DE CORREÇÃO: Se for Férias, cria um Período Aquisitivo
  if (dados.tipo === 'Férias') {
    const periodoPayload = {
      funcionario_id: dados.funcionario_id,
      inicio_periodo: dados.data_inicio, // Data Inicial
      fim_periodo: dados.data_fim,       // Data Final
      limite_concessivo: dados.data_limite || dados.data_fim, // Data Limite
      dias_direito: dados.quantidade,
      status: 'Aberto'
    };
    const { data, error } = await supabase.from('periodos_aquisitivos').insert([periodoPayload]).select();
    if (error) throw error;
    return data[0];
  } 
  
  // Se for Banco de Horas ou Outros, vai para o histórico comum
  else {
    // Mapeia campos do form para a tabela de histórico
    const historicoPayload = {
      funcionario_id: dados.funcionario_id,
      tipo: dados.tipo,
      quantidade: dados.quantidade,
      unidade: dados.unidade,
      motivo: dados.motivo,
      data_lancamento: dados.data_inicio // Usa a data de início como referência
    };
    const { data, error } = await supabase.from('historico_creditos').insert([historicoPayload]).select();
    if (error) throw error;
    return data[0];
  }
};

// --- 3. BUSCAS OTIMIZADAS ---

export const getMuralRecente = async () => {
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje); trintaDiasAtras.setDate(hoje.getDate() - 30);
  const trintaDiasFrente = new Date(hoje); trintaDiasFrente.setDate(hoje.getDate() + 30);

  const { data: ausencias } = await supabase
    .from('solicitacoes_ausencia')
    .select('*, funcionarios(nome_completo, avatar_url, cargo)')
    .gte('data_inicio', trintaDiasAtras.toISOString())
    .lte('data_inicio', trintaDiasFrente.toISOString())
    .order('created_at', { ascending: false });

  const { data: creditos } = await supabase
    .from('historico_creditos')
    .select('*, funcionarios(nome_completo, avatar_url, cargo)')
    .gte('data_lancamento', trintaDiasAtras.toISOString())
    .lte('data_lancamento', trintaDiasFrente.toISOString())
    .order('created_at', { ascending: false });

  return { ausencias: ausencias || [], creditos: creditos || [] };
};

export const getExtratoFiltrado = async ({ funcionarioId, dataInicio, dataFim }) => {
  let queryAusencia = supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url)').order('data_inicio', { ascending: false });
  let queryCredito = supabase.from('historico_creditos').select('*, funcionarios(nome_completo, avatar_url)').order('data_lancamento', { ascending: false });

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

// --- 4. CALENDÁRIO (Corrigido para mostrar Pendentes) ---

export const getFeriasAprovadasParaCalendario = async (ano, mes, searchTerm = '', departamento = 'Todos') => {
  const dataInicioMes = new Date(ano, mes - 1, 1).toISOString();
  const dataFimMes = new Date(ano, mes, 0).toISOString();

  let query = supabase
    .from('solicitacoes_ausencia')
    .select(`
      id,
      data_inicio,
      data_fim,
      status, 
      funcionario_id,
      funcionarios ( nome_completo, departamento )
    `)
    .eq('tipo', 'Férias')
    // CORREÇÃO: Removido .eq('status', 'Aprovado') para mostrar tudo
    .neq('status', 'Rejeitado') // Só não mostra rejeitados
    .or(
      `data_inicio.gte.${dataInicioMes},data_inicio.lte.${dataFimMes},` +
      `data_fim.gte.${dataInicioMes},data_fim.lte.${dataFimMes},` +
      `and(data_inicio.lt.${dataInicioMes},data_fim.gt.${dataFimMes})`
    );

  if (departamento && departamento !== 'Todos') {
    query = query.eq('funcionarios.departamento', departamento);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// --- 5. GESTÃO E AUXILIARES ---

export const updateStatusSolicitacao = async (id, status) => {
  const { data, error } = await supabase.from('solicitacoes_ausencia').update({ status }).eq('id', id).select();
  if (error) throw error;
  return data[0];
};

export const deleteAusenciaSegura = async (id) => {
  const { data: atual } = await supabase.from('solicitacoes_ausencia').select('status, anexo_path').eq('id', id).single();
  if (!atual) throw new Error("Registro não encontrado.");
  if (atual.status !== 'Pendente') throw new Error("SEGURANÇA: Não é permitido excluir registros já Aprovados.");
  if (atual.anexo_path) await supabase.storage.from(ANEXOS_BUCKET).remove([atual.anexo_path]);
  const { error } = await supabase.from('solicitacoes_ausencia').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const deleteCreditoSeguro = async (id) => {
  const ontem = new Date(); ontem.setHours(ontem.getHours() - 24);
  const { data: atual } = await supabase.from('historico_creditos').select('created_at').eq('id', id).single();
  if (!atual) throw new Error("Crédito não encontrado.");
  if (new Date(atual.created_at) < ontem) throw new Error("AUDITORIA: Créditos antigos não podem ser excluídos.");
  const { error } = await supabase.from('historico_creditos').delete().eq('id', id);
  if (error) throw error;
  return true;
};

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
  const { data } = await supabase.from('solicitacoes_ausencia').select('id').eq('funcionario_id', funcionarioId).neq('status', 'Rejeitado').or(`data_inicio.lte.${dataFim},data_fim.gte.${dataInicio}`);
  return data?.length > 0;
};
export const checkExistingFeriasNoAno = async (funcionarioId, ano) => {
  const inicioAno = `${ano}-01-01`;
  const fimAno = `${ano}-12-31`;
  const { data } = await supabase.from('solicitacoes_ausencia').select('id').eq('funcionario_id', funcionarioId).eq('tipo', 'Férias').neq('status', 'Rejeitado').gte('data_inicio', inicioAno).lte('data_inicio', fimAno);
  return data?.length > 0;
};
export const getHistoricoAusencias = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*'); return data; };
export const getHistoricoCreditos = async () => { const { data } = await supabase.from('historico_creditos').select('*'); return data; };
export const getTodasSolicitacoes = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url, cargo)'); return data; };
export const concluirSolicitacao = async (id) => updateStatusSolicitacao(id, 'Concluído');