// src/services/ausenciaService.js
import { supabase } from './supabaseClient';

const ANEXOS_BUCKET = 'anexos_ausencias';

// ==============================================================================
// 1. UPLOAD E ARQUIVOS
// ==============================================================================

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

// ==============================================================================
// 2. CRIAÇÃO E LANÇAMENTO (DÉBITOS E CRÉDITOS)
// ==============================================================================

export const createAusencia = async (dados) => {
  if (['Férias', 'Folga Pessoal'].includes(dados.tipo)) {
    const temConflito = await checkConflitoDatas(dados.funcionario_id, dados.data_inicio, dados.data_fim);
    if (temConflito) throw new Error("Já existe uma ausência registrada neste período.");
  }

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .insert([dados])
    .select();

  if (error) throw error;
  return data[0];
};

export const createCreditoSaldo = async (dados) => {
  if (dados.tipo === 'Férias') {
    const periodoPayload = {
      funcionario_id: dados.funcionario_id,
      inicio_periodo: dados.data_inicio,
      fim_periodo: dados.data_fim,
      limite_concessivo: dados.data_limite || dados.data_fim,
      dias_direito: dados.quantidade,
      status: 'Aberto'
    };
    const { data, error } = await supabase.from('periodos_aquisitivos').insert([periodoPayload]).select();
    if (error) throw error;
    return data[0];
  } else {
    const historicoPayload = {
      funcionario_id: dados.funcionario_id,
      tipo: dados.tipo,
      quantidade: dados.quantidade,
      unidade: dados.unidade,
      motivo: dados.motivo,
      data_lancamento: dados.data_inicio 
    };
    const { data, error } = await supabase.from('historico_creditos').insert([historicoPayload]).select();
    if (error) throw error;
    return data[0];
  }
};

// ==============================================================================
// 3. BUSCAS OTIMIZADAS (MURAL E HISTÓRICO)
// ==============================================================================

export const getMuralRecente = async () => {
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje); trintaDiasAtras.setDate(hoje.getDate() - 30);
  const trintaDiasFrente = new Date(hoje); trintaDiasFrente.setDate(hoje.getDate() + 30);

  const queryAusencias = supabase
    .from('solicitacoes_ausencia')
    .select('*, funcionarios(nome_completo, avatar_url, cargo)')
    .gte('data_inicio', trintaDiasAtras.toISOString())
    .lte('data_inicio', trintaDiasFrente.toISOString())
    .order('created_at', { ascending: false });

  const queryCreditos = supabase
    .from('historico_creditos')
    .select('*, funcionarios(nome_completo, avatar_url, cargo)')
    .gte('data_lancamento', trintaDiasAtras.toISOString())
    .lte('data_lancamento', trintaDiasFrente.toISOString())
    .order('created_at', { ascending: false });

  const queryPeriodos = supabase
    .from('periodos_aquisitivos')
    .select('*, funcionarios(nome_completo, avatar_url, cargo)')
    .gte('created_at', trintaDiasAtras.toISOString()) 
    .order('created_at', { ascending: false });

  const [resA, resC, resP] = await Promise.all([queryAusencias, queryCreditos, queryPeriodos]);

  return { 
    ausencias: resA.data || [], 
    creditos: resC.data || [],
    periodos: resP.data || [] 
  };
};

export const getExtratoFiltrado = async ({ funcionarioId, dataInicio, dataFim }) => {
  let queryAusencia = supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url)').order('data_inicio', { ascending: false });
  let queryCredito = supabase.from('historico_creditos').select('*, funcionarios(nome_completo, avatar_url)').order('data_lancamento', { ascending: false });
  let queryPeriodos = supabase.from('periodos_aquisitivos').select('*, funcionarios(nome_completo, avatar_url)').order('inicio_periodo', { ascending: false });

  if (funcionarioId) {
    queryAusencia = queryAusencia.eq('funcionario_id', funcionarioId);
    queryCredito = queryCredito.eq('funcionario_id', funcionarioId);
    queryPeriodos = queryPeriodos.eq('funcionario_id', funcionarioId);
  }
  if (dataInicio) {
    queryAusencia = queryAusencia.gte('data_inicio', dataInicio);
    queryCredito = queryCredito.gte('data_lancamento', dataInicio);
    queryPeriodos = queryPeriodos.gte('inicio_periodo', dataInicio);
  }
  if (dataFim) {
    queryAusencia = queryAusencia.lte('data_inicio', dataFim);
    queryCredito = queryCredito.lte('data_lancamento', dataFim);
    queryPeriodos = queryPeriodos.lte('inicio_periodo', dataFim);
  }

  const [resA, resC, resP] = await Promise.all([queryAusencia, queryCredito, queryPeriodos]);
  
  if (resA.error) throw resA.error;
  if (resC.error) throw resC.error;
  if (resP.error) throw resP.error;

  return { 
    ausencias: resA.data || [], 
    creditos: resC.data || [],
    periodos: resP.data || []
  };
};

// ==============================================================================
// 4. CALENDÁRIO (MÓDULO FÉRIAS - ATUALIZADO)
// ==============================================================================

export const getFeriasAprovadasParaCalendario = async (ano, mes, searchTerm = '', departamento = 'Todos') => {
  const mesFormatado = String(mes).padStart(2, '0');
  
  // Define o range do mês completo
  const dataInicioMes = `${ano}-${mesFormatado}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFimMes = `${ano}-${mesFormatado}-${ultimoDia}`;

  let query = supabase
    .from('solicitacoes_ausencia')
    .select(`
      id, 
      data_inicio, 
      data_fim, 
      status, 
      tipo,
      funcionario_id,
      funcionarios!inner ( id, nome_completo, departamento, avatar_url )
    `)
    // Filtra para mostrar apenas Férias e Folgas no calendário
    .in('tipo', ['Férias', 'Folga Pessoal'])
    // Exclui apenas os rejeitados (mostra Pendente e Aprovado)
    .neq('status', 'Rejeitado')
    // Lógica para pegar qualquer evento que intercepte o mês atual (começa antes e termina depois, ou está contido)
    .or(`data_inicio.lte.${dataFimMes},data_fim.gte.${dataInicioMes}`);

  // Filtro de Departamento
  if (departamento && departamento !== 'Todos') {
    query = query.eq('funcionarios.departamento', departamento);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filtro de Nome (feito em memória para simplificar, já que Search em Relacionamento requer steps extras)
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    return data.filter(item => 
      item.funcionarios?.nome_completo?.toLowerCase().includes(term)
    );
  }

  return data;
};

// ==============================================================================
// 5. GESTÃO SEGURA E AUDITORIA
// ==============================================================================

export const updateStatusSolicitacao = async (id, status) => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .update({ status })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

export const deleteAusenciaSegura = async (id) => {
  const { data: atual } = await supabase.from('solicitacoes_ausencia').select('status, anexo_path').eq('id', id).single();
  
  if (!atual) throw new Error("Registro não encontrado.");
  
  if (atual.status !== 'Pendente') {
    throw new Error("SEGURANÇA: Não é permitido excluir registros já Aprovados/Concluídos. Use um ajuste.");
  }

  if (atual.anexo_path) {
    await supabase.storage.from(ANEXOS_BUCKET).remove([atual.anexo_path]);
  }

  const { error } = await supabase.from('solicitacoes_ausencia').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const deleteCreditoSeguro = async (id) => {
  const { data: credito } = await supabase.from('historico_creditos').select('created_at').eq('id', id).maybeSingle();
  
  if (credito) {
    const ontem = new Date(); ontem.setHours(ontem.getHours() - 24);
    if (new Date(credito.created_at) < ontem) {
      throw new Error("AUDITORIA: Créditos antigos não podem ser excluídos.");
    }
    const { error } = await supabase.from('historico_creditos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  const { data: periodo } = await supabase.from('periodos_aquisitivos').select('created_at, status').eq('id', id).maybeSingle();
  if (periodo) {
    if (periodo.status === 'Fechado') throw new Error("Não é possível excluir um período aquisitivo já fechado/gozado.");
    const { error } = await supabase.from('periodos_aquisitivos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  throw new Error("Registro não encontrado para exclusão.");
};

// --- 6. AUXILIARES E LEITURA ---

export const getAusenciaById = async (id) => {
  if (!id) return null;
  const { data, error } = await supabase.from('solicitacoes_ausencia').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const getCreditoById = async (id) => {
  let { data } = await supabase.from('historico_creditos').select('*').eq('id', id).maybeSingle();
  if (!data) {
    ({ data } = await supabase.from('periodos_aquisitivos').select('*').eq('id', id).maybeSingle());
    if(data) {
      data.tipo = 'Férias';
      data.quantidade = data.dias_direito;
      data.unidade = 'dias';
      data.data_lancamento = data.inicio_periodo;
      data.data_inicio = data.inicio_periodo;
      data.data_fim = data.fim_periodo;
      data.data_limite = data.limite_concessivo;
    }
  }
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
  if (dados.tipo === 'Férias') {
     const periodoPayload = {
      inicio_periodo: dados.data_inicio,
      fim_periodo: dados.data_fim,
      limite_concessivo: dados.data_limite,
      dias_direito: dados.quantidade
    };
    const { data, error } = await supabase.from('periodos_aquisitivos').update(periodoPayload).eq('id', id).select();
    if (error) throw error;
    return data[0];
  } else {
    const historicoPayload = {
      tipo: dados.tipo,
      quantidade: dados.quantidade,
      unidade: dados.unidade,
      motivo: dados.motivo,
      data_lancamento: dados.data_inicio
    };
    const { data, error } = await supabase.from('historico_creditos').update(historicoPayload).eq('id', id).select();
    if (error) throw error;
    return data[0];
  }
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

// Funções legadas mantidas
export const getHistoricoAusencias = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*'); return data; };
export const getHistoricoCreditos = async () => { const { data } = await supabase.from('historico_creditos').select('*'); return data; };
export const getTodasSolicitacoes = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url, cargo)'); return data; };
export const concluirSolicitacao = async (id) => updateStatusSolicitacao(id, 'Concluído');
export const deleteSolicitacao = async (id) => deleteAusenciaSegura(id);