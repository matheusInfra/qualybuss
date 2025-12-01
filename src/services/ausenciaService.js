// src/services/ausenciaService.js
import { supabase } from './supabaseClient';

const ANEXOS_BUCKET = 'anexos_ausencias';

// --- INTELIGÊNCIA DE NEGÓCIO (VALIDAÇÕES) ---

const FERIADOS_NACIONAIS = [
  '01-01', '21-04', '01-05', '07-09', '12-10', '02-11', '15-11', '25-12'
];

const isFeriado = (dataString) => {
  if (!dataString) return false;
  const partes = dataString.split('-');
  if (partes.length !== 3) return false;
  const mesDia = `${partes[1]}-${partes[2]}`;
  return FERIADOS_NACIONAIS.includes(mesDia);
};

export const validarRegrasCLT = (dataInicio) => {
  if (!dataInicio) return { valido: true };
  
  const date = new Date(dataInicio + 'T00:00:00'); 
  const diaSemana = date.getDay(); 
  
  if (diaSemana === 0 || diaSemana === 6 || diaSemana === 5) {
    return {
      valido: false,
      mensagem: "⚠️ Pela legislação, recomenda-se não iniciar férias em Sextas, Sábados ou Domingos."
    };
  }

  if (isFeriado(dataInicio)) {
    return { valido: false, mensagem: "⚠️ Não é permitido iniciar férias em feriados." };
  }

  return { valido: true };
};

export const checkConflitoDatas = async (funcionarioId, dataInicio, dataFim, excludeId = null) => {
  let query = supabase.from('solicitacoes_ausencia')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .neq('status', 'Rejeitado')
    .or(`data_inicio.lte.${dataFim},data_fim.gte.${dataInicio}`);
  
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return data?.length > 0;
};

// ==============================================================================
// 1. UPLOAD E ARQUIVOS
// ==============================================================================

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

// ==============================================================================
// 2. CRIAÇÃO E EDIÇÃO (CRUD)
// ==============================================================================

export const createAusencia = async (dados) => {
  const temConflito = await checkConflitoDatas(dados.funcionario_id, dados.data_inicio, dados.data_fim);
  if (temConflito) throw new Error("Conflito: Já existe uma ausência neste período.");

  if (dados.tipo === 'Férias') {
    const checkCLT = validarRegrasCLT(dados.data_inicio);
    if (!checkCLT.valido) throw new Error(checkCLT.mensagem);
  }

  const { data, error } = await supabase.from('solicitacoes_ausencia').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

export const updateAusencia = async (id, dados) => {
  const { data: atual } = await supabase.from('solicitacoes_ausencia').select('status, funcionario_id').eq('id', id).single();
  if (!atual) throw new Error("Registro não encontrado.");
  if (atual.status !== 'Pendente') throw new Error("Apenas solicitações Pendentes podem ser editadas.");

  if (dados.data_inicio && dados.data_fim) {
    const temConflito = await checkConflitoDatas(atual.funcionario_id, dados.data_inicio, dados.data_fim, id);
    if (temConflito) throw new Error("A nova data conflita com outro registro.");

    const checkCLT = validarRegrasCLT(dados.data_inicio);
    if (!checkCLT.valido) throw new Error(checkCLT.mensagem);
  }
  
  const { data, error } = await supabase.from('solicitacoes_ausencia').update(dados).eq('id', id).select();
  if (error) throw error;
  return data[0];
};

export const deleteAusenciaSegura = async (id) => {
  const { data: atual } = await supabase.from('solicitacoes_ausencia').select('status, anexo_path').eq('id', id).single();
  if (!atual) throw new Error("Registro não encontrado.");
  if (atual.status !== 'Pendente') throw new Error("Por segurança, apenas registros Pendentes podem ser excluídos.");
  if (atual.anexo_path) await supabase.storage.from(ANEXOS_BUCKET).remove([atual.anexo_path]);
  const { error } = await supabase.from('solicitacoes_ausencia').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ==============================================================================
// 3. CRÉDITOS E SALDOS
// ==============================================================================

export const getPeriodosAquisitivos = async (funcionarioId) => {
  const { data, error } = await supabase.from('periodos_aquisitivos').select('*').eq('funcionario_id', funcionarioId).order('inicio_periodo', { ascending: true });
  if (error) throw error;
  return data;
};

export const updatePeriodoAquisitivo = async (id, dados) => {
  const { data, error } = await supabase.from('periodos_aquisitivos').update(dados).eq('id', id).select();
  if (error) throw error;
  return data[0];
};

export const createCreditoSaldo = async (dados) => {
  if (dados.tipo === 'Férias') {
    const { data, error } = await supabase.from('periodos_aquisitivos').insert([{
      funcionario_id: dados.funcionario_id,
      inicio_periodo: dados.data_inicio,
      fim_periodo: dados.data_fim,
      limite_concessivo: dados.data_limite || dados.data_fim,
      dias_direito: dados.quantidade,
      status: 'Aberto'
    }]).select();
    if (error) throw error;
    return data[0];
  } else {
    const { data, error } = await supabase.from('historico_creditos').insert([{
      funcionario_id: dados.funcionario_id,
      tipo: dados.tipo,
      quantidade: dados.quantidade,
      unidade: dados.unidade,
      motivo: dados.motivo,
      data_lancamento: dados.data_inicio 
    }]).select();
    if (error) throw error;
    return data[0];
  }
};

export const getCreditoById = async (id) => {
  if (!id) return null;
  const { data: credito } = await supabase.from('historico_creditos').select('*').eq('id', id).maybeSingle();
  if (credito) return credito;
  const { data: periodo } = await supabase.from('periodos_aquisitivos').select('*').eq('id', id).maybeSingle();
  if (periodo) {
    return {
      ...periodo, tipo: 'Férias', quantidade: periodo.dias_direito,
      data_lancamento: periodo.inicio_periodo, data_inicio: periodo.inicio_periodo,
      data_fim: periodo.fim_periodo, data_limite: periodo.limite_concessivo
    };
  }
  return null;
};

export const updateCredito = async (id, dados) => {
  if (dados.tipo === 'Férias') {
     const { data, error } = await supabase.from('periodos_aquisitivos').update({
      inicio_periodo: dados.data_inicio, fim_periodo: dados.data_fim,
      limite_concessivo: dados.data_limite, dias_direito: dados.quantidade
    }).eq('id', id).select();
    if (error) throw error; return data[0];
  } else {
    const { data, error } = await supabase.from('historico_creditos').update({
      tipo: dados.tipo, quantidade: dados.quantidade, unidade: dados.unidade,
      motivo: dados.motivo, data_lancamento: dados.data_inicio
    }).eq('id', id).select();
    if (error) throw error; return data[0];
  }
};

export const deleteCreditoSeguro = async (id) => {
  const { error } = await supabase.from('historico_creditos').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ==============================================================================
// 4. LEITURA (CALENDÁRIO/DASHBOARD/HISTÓRICO)
// ==============================================================================

export const getFeriasAprovadasParaCalendario = async (ano, mes, searchTerm = '', departamento = 'Todos') => {
  const mesFormatado = String(mes).padStart(2, '0');
  const dataInicioMes = `${ano}-${mesFormatado}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFimMes = `${ano}-${mesFormatado}-${ultimoDia}`;

  let query = supabase.from('solicitacoes_ausencia')
    .select(`id, data_inicio, data_fim, status, tipo, funcionario_id, funcionarios!inner ( id, nome_completo, departamento, avatar_url )`)
    .in('tipo', ['Férias', 'Folga Pessoal', 'Licença Paternidade/Maternidade', 'Atestado Médico'])
    .neq('status', 'Rejeitado')
    .or(`data_inicio.lte.${dataFimMes},data_fim.gte.${dataInicioMes}`);

  if (departamento && departamento !== 'Todos') query = query.eq('funcionarios.departamento', departamento);
  if (searchTerm) query = query.ilike('funcionarios.nome_completo', `%${searchTerm}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getExtratoFiltrado = async ({ funcionarioId, dataInicio, dataFim }) => {
  let qA = supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url)').order('data_inicio', { ascending: false });
  let qC = supabase.from('historico_creditos').select('*, funcionarios(nome_completo, avatar_url)').order('data_lancamento', { ascending: false });
  let qP = supabase.from('periodos_aquisitivos').select('*, funcionarios(nome_completo, avatar_url)').order('inicio_periodo', { ascending: false });

  if (funcionarioId) { qA = qA.eq('funcionario_id', funcionarioId); qC = qC.eq('funcionario_id', funcionarioId); qP = qP.eq('funcionario_id', funcionarioId); }
  if (dataInicio) { qA = qA.gte('data_inicio', dataInicio); qC = qC.gte('data_lancamento', dataInicio); qP = qP.gte('inicio_periodo', dataInicio); }
  if (dataFim) { qA = qA.lte('data_inicio', dataFim); qC = qC.lte('data_lancamento', dataFim); qP = qP.lte('inicio_periodo', dataFim); }

  const [resA, resC, resP] = await Promise.all([qA, qC, qP]);
  return { ausencias: resA.data || [], creditos: resC.data || [], periodos: resP.data || [] };
};

export const getMuralRecente = async () => {
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje); trintaDiasAtras.setDate(hoje.getDate() - 30);
  const trintaDiasFrente = new Date(hoje); trintaDiasFrente.setDate(hoje.getDate() + 30);

  const qA = supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url, cargo)').gte('data_inicio', trintaDiasAtras.toISOString()).lte('data_inicio', trintaDiasFrente.toISOString()).order('created_at', { ascending: false });
  const qC = supabase.from('historico_creditos').select('*, funcionarios(nome_completo, avatar_url, cargo)').gte('data_lancamento', trintaDiasAtras.toISOString()).lte('data_lancamento', trintaDiasFrente.toISOString()).order('created_at', { ascending: false });
  const qP = supabase.from('periodos_aquisitivos').select('*, funcionarios(nome_completo, avatar_url, cargo)').gte('created_at', trintaDiasAtras.toISOString()).order('created_at', { ascending: false });

  const [resA, resC, resP] = await Promise.all([qA, qC, qP]);
  return { ausencias: resA.data || [], creditos: resC.data || [], periodos: resP.data || [] };
};

export const updateStatusSolicitacao = async (id, status) => {
  const { data, error } = await supabase.from('solicitacoes_ausencia').update({ status }).eq('id', id).select();
  if (error) throw error;
  return data[0];
};

export const getAusenciaById = async (id) => {
  if (!id) return null;
  const { data, error } = await supabase.from('solicitacoes_ausencia').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

// ==============================================================================
// 7. MÓDULO DE AJUSTES E RETIFICAÇÕES (NOVO FLUXO)
// ==============================================================================

export const solicitarAjuste = async (payload) => {
  const { data, error } = await supabase
    .from('solicitacoes_ajuste') // Se esta tabela não existir, crie-a no Supabase
    .insert([{
      ausencia_id: payload.ausencia_id,
      tipo_ajuste: payload.tipo_ajuste,
      justificativa: payload.justificativa,
      dados_anteriores: payload.dados_anteriores,
      novos_dados: payload.novos_dados,
      status: 'Pendente',
      solicitante_id: (await supabase.auth.getUser()).data.user?.id
    }])
    .select();

  if (error) throw new Error("Falha ao registrar solicitação de ajuste: " + error.message);
  return data[0];
};

export const getAjustesPendentes = async () => {
  const { data, error } = await supabase
    .from('solicitacoes_ajuste')
    .select(`*, ausencia:ausencia_id ( id, funcionarios ( nome_completo, cargo ) )`)
    .eq('status', 'Pendente')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const aprovarAjuste = async (ajusteId, dadosNovos, ausenciaId) => {
  // 1. Atualiza a Ausência Original
  const { error: updateError } = await supabase
    .from('solicitacoes_ausencia')
    .update({ tipo: dadosNovos.tipo, data_inicio: dadosNovos.data_inicio, data_fim: dadosNovos.data_fim })
    .eq('id', ausenciaId);

  if (updateError) throw updateError;

  // 2. Fecha o ticket
  const { error: ajusteError } = await supabase
    .from('solicitacoes_ajuste')
    .update({ status: 'Aprovado', data_aprovacao: new Date() })
    .eq('id', ajusteId);

  if (ajusteError) throw ajusteError;

  // 3. Grava Auditoria
  await supabase.from('auditoria_ajustes').insert([{
    tipo_acao: 'Retificação Aprovada', justificativa: `Ajuste ID ${ajusteId} aprovado.`,
    tabela_afetada: 'solicitacoes_ausencia', registro_id: ausenciaId
  }]);

  return true;
};

export const rejeitarAjuste = async (ajusteId, motivoRejeicao) => {
  const { error } = await supabase
    .from('solicitacoes_ajuste')
    .update({ status: 'Rejeitado', obs_resolucao: motivoRejeicao, data_aprovacao: new Date() })
    .eq('id', ajusteId);

  if (error) throw error;
  return true;
};

// Funções legadas (mantidas)
export const getHistoricoAusencias = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*'); return data; };
export const getHistoricoCreditos = async () => { const { data } = await supabase.from('historico_creditos').select('*'); return data; };
export const getTodasSolicitacoes = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url, cargo)'); return data; };
export const concluirSolicitacao = async (id) => updateStatusSolicitacao(id, 'Concluído');
export const deleteSolicitacao = async (id) => deleteAusenciaSegura(id);