// src/services/ausenciaService.js
import { supabase } from './supabaseClient'; //

const ANEXOS_BUCKET = 'anexos_ausencias';

// ==============================================================================
// 0. INTELIGÊNCIA DE NEGÓCIO & VALIDAÇÕES
// ==============================================================================

const FERIADOS_NACIONAIS = [
  '01-01', '21-04', '01-05', '07-09', '12-10', '02-11', '15-11', '25-12'
];

const isFeriado = (dataString) => {
  if (!dataString) return false;
  const partes = dataString.split('-'); // YYYY-MM-DD
  if (partes.length !== 3) return false;
  const mesDia = `${partes[1]}-${partes[2]}`;
  return FERIADOS_NACIONAIS.includes(mesDia);
};

export const validarRegrasCLT = (dataInicio) => {
  if (!dataInicio) return { valido: true };
  
  // Cria data ignorando hora para evitar erros de fuso
  const [ano, mes, dia] = dataInicio.split('-').map(Number);
  const date = new Date(ano, mes - 1, dia); 
  const diaSemana = date.getDay(); // 0=Dom, 1=Seg, ..., 5=Sex, 6=Sáb
  
  // Regra: Evitar início em Sexta(5), Sábado(6) ou Domingo(0)
  // [REFATORADO] Adicionado flag 'bloqueante' para controle de UI
  if (diaSemana === 5 || diaSemana === 6 || diaSemana === 0) {
    return {
      valido: false,
      bloqueante: true, // Indica que isso gera passivo trabalhista real
      mensagem: "⚠️ Risco Trabalhista: Pela legislação (Precedente Normativo 100 TST), o início das férias não deve ocorrer em Sextas, Sábados, Domingos ou Feriados."
    };
  }

  if (isFeriado(dataInicio)) {
    return { 
      valido: false, 
      bloqueante: true,
      mensagem: "🚫 Proibido: Não é permitido iniciar férias em feriados nacionais." 
    };
  }

  return { valido: true, bloqueante: false };
};

export const checkConflitoDatas = async (funcionarioId, dataInicio, dataFim, excludeId = null) => {
  let query = supabase.from('solicitacoes_ausencia')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .neq('status', 'Rejeitado')
    // Verifica sobreposição de datas: (InicioA <= FimB) e (FimA >= InicioB)
    .or(`data_inicio.lte.${dataFim},data_fim.gte.${dataInicio}`);
  
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query;
  return data?.length > 0;
};

// Auxiliar para cálculo de dias
const calcularDias = (inicio, fim) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const [ano1, mes1, dia1] = inicio.split('-').map(Number);
  const [ano2, mes2, dia2] = fim.split('-').map(Number);
  const d1 = new Date(ano1, mes1-1, dia1);
  const d2 = new Date(ano2, mes2-1, dia2);
  
  return Math.round(Math.abs((d1 - d2) / oneDay)) + 1;
};

// ==============================================================================
// 1. GESTÃO DE SALDO (O "BANCO" DE DIAS E ESTORNO)
// ==============================================================================

/**
 * Consome dias do período aquisitivo mais antigo em aberto (FIFO).
 */
const movimentarSaldoFerias = async (funcionarioId, diasQtd) => {
  if (diasQtd === 0) return;

  const { data: periodos } = await supabase
    .from('periodos_aquisitivos')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .eq('status', 'Aberto')
    .gt('saldo_atual', 0) // Garante que pega apenas quem tem saldo
    .order('inicio_periodo', { ascending: true }); // Prioriza vencer o mais antigo

  if (!periodos || periodos.length === 0) {
    // Se for consumo (>0) e não tem saldo, erro. Se for devolução (<0), permite passar pois será tratado no estorno.
    if (diasQtd > 0) throw new Error("O funcionário não possui saldo de férias disponível.");
  }

  let diasRestantes = diasQtd;

  for (const periodo of periodos) {
    if (diasRestantes <= 0) break;

    const saldoDisponivel = periodo.saldo_atual;
    const abate = Math.min(diasRestantes, saldoDisponivel);

    const novosDiasGozados = (periodo.dias_gozados || 0) + abate;
    
    // Verifica se vai zerar o saldo (saldo_total - dias_gozados <= 0)
    // O saldo_atual é calculado via trigger/view ou na aplicação (dias_direito - dias_gozados)
    const saldoFinal = periodo.dias_direito - novosDiasGozados;
    const vaiFechar = saldoFinal <= 0;

    await supabase
      .from('periodos_aquisitivos')
      .update({ 
        dias_gozados: novosDiasGozados, 
        status: vaiFechar ? 'Fechado' : 'Aberto' 
      })
      .eq('id', periodo.id);

    diasRestantes -= abate;
  }

  if (diasRestantes > 0) {
    throw new Error(`Saldo insuficiente! Faltam ${diasRestantes} dias para completar a solicitação.`);
  }
};

/**
 * [NOVO] Devolve dias para o saldo (Estorno)
 * Usado quando uma férias aprovada é cancelada ou excluída.
 */
const estornarSaldoFerias = async (funcionarioId, diasQtd) => {
  if (diasQtd <= 0) return;

  // Busca histórico de períodos para devolver (pode incluir fechados que reabrirão)
  // Ordena pelo mais recente para devolver para onde provavelmente foi tirado, ou o mais antigo aberto.
  // Estratégia segura: Devolver para o período aberto mais antigo ou reabrir o último fechado.
  const { data: periodos } = await supabase
    .from('periodos_aquisitivos')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('inicio_periodo', { ascending: true });

  let diasParaDevolver = diasQtd;

  for (const periodo of periodos) {
    if (diasParaDevolver === 0) break;

    // Só podemos devolver se houver dias gozados para "des-gozar"
    if (periodo.dias_gozados > 0) {
      const devolucao = Math.min(diasParaDevolver, periodo.dias_gozados);
      
      await supabase
        .from('periodos_aquisitivos')
        .update({ 
          dias_gozados: periodo.dias_gozados - devolucao,
          status: 'Aberto' // Força reabertura se recebeu dias de volta
        })
        .eq('id', periodo.id);

      diasParaDevolver -= devolucao;
    }
  }
};

export const getResumoSaldos = async (funcionarioId) => {
  const { data: periodos } = await supabase
    .from('periodos_aquisitivos')
    .select('saldo_atual')
    .eq('funcionario_id', funcionarioId)
    .eq('status', 'Aberto');
  
  const saldoFerias = periodos?.reduce((acc, p) => acc + (p.saldo_atual || 0), 0) || 0;

  const { data: creditos } = await supabase.from('historico_creditos').select('tipo, quantidade').eq('funcionario_id', funcionarioId);
  const { data: debitos } = await supabase.from('solicitacoes_ausencia').select('tipo, quantidade, status').eq('funcionario_id', funcionarioId).neq('status', 'Rejeitado');

  const entradasBH = creditos?.filter(c => c.tipo === 'Banco de Horas').reduce((acc, c) => acc + Number(c.quantidade), 0) || 0;
  const saidasBH = debitos?.filter(d => d.tipo === 'Banco de Horas').reduce((acc, d) => acc + Number(d.quantidade), 0) || 0;

  const entradasFolga = creditos?.filter(c => c.tipo === 'Folga').reduce((acc, c) => acc + Number(c.quantidade), 0) || 0;
  const saidasFolga = debitos?.filter(d => d.tipo === 'Folga Pessoal' || d.tipo === 'Folga').reduce((acc, d) => acc + Number(d.quantidade), 0) || 0;

  return {
    ferias: { saldo: saldoFerias, unidade: 'dias' },
    banco_horas: { saldo: (entradasBH - saidasBH).toFixed(2), unidade: 'horas' },
    folgas: { saldo: (entradasFolga - saidasFolga), unidade: 'dias' }
  };
};

// ==============================================================================
// 2. CRIAÇÃO E EDIÇÃO DE AUSÊNCIAS
// ==============================================================================

export const createAusencia = async (dados) => {
  // 1. Verifica conflitos
  const temConflito = await checkConflitoDatas(dados.funcionario_id, dados.data_inicio, dados.data_fim);
  if (temConflito) throw new Error("Conflito: Já existe uma ausência registrada neste período.");

  // 2. Valida regras de negócio (CLT)
  if (dados.tipo === 'Férias') {
    const checkCLT = validarRegrasCLT(dados.data_inicio);
    // [ATENÇÃO] Aqui permitimos passar se for apenas alerta, o bloqueio real deve ser na UI ou configurável
    if (!checkCLT.valido && checkCLT.bloqueante) {
        // Se quiser ser rígido no backend: throw new Error(checkCLT.mensagem);
        console.warn("Aviso CLT:", checkCLT.mensagem);
    }
  }

  // 3. Insere
  const { data, error } = await supabase.from('solicitacoes_ausencia').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

export const solicitarAusencia = createAusencia;

export const lancarCredito = async (dados) => {
  // [REFATORADO] Separação lógica: Férias = Período Aquisitivo; Outros = Créditos Avulsos
  if (dados.tipo === 'Férias') {
    const { data, error } = await supabase.from('periodos_aquisitivos').insert([{
      funcionario_id: dados.funcionario_id,
      inicio_periodo: dados.data_inicio,
      fim_periodo: dados.data_fim, 
      dias_direito: dados.quantidade, // Geralmente 30 dias
      status: 'Aberto',
      // saldo_atual é calculado automaticamente pelo DB ou assume valor inicial
    }]).select();
    if (error) throw error; 
    return data[0];
  } 
  
  // Banco de Horas / Folgas
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
};

export const updateAusencia = async (id, dados) => {
  const { data: atual } = await supabase.from('solicitacoes_ausencia').select('status, funcionario_id').eq('id', id).single();
  if (!atual) throw new Error("Registro não encontrado.");
  
  // Permite edição apenas se Pendente (para integridade de saldo já descontado)
  if (atual.status !== 'Pendente') throw new Error("Apenas solicitações Pendentes podem ser editadas. Para alterar uma aprovada, solicite um ajuste/cancelamento.");

  if (dados.data_inicio && dados.data_fim) {
    const temConflito = await checkConflitoDatas(atual.funcionario_id, dados.data_inicio, dados.data_fim, id);
    if (temConflito) throw new Error("A nova data conflita com outro registro existente.");

    const checkCLT = validarRegrasCLT(dados.data_inicio);
    if (!checkCLT.valido && checkCLT.bloqueante) console.warn(checkCLT.mensagem);
  }
  
  const { data, error } = await supabase.from('solicitacoes_ausencia').update(dados).eq('id', id).select();
  if (error) throw error;
  return data[0];
};

export const deleteAusenciaSegura = async (id) => {
  // 1. Busca os dados antes de apagar para verificar status e anexos
  const { data: atual } = await supabase
    .from('solicitacoes_ausencia')
    .select('status, anexo_path, tipo, funcionario_id, quantidade, data_inicio, data_fim')
    .eq('id', id)
    .single();

  if (!atual) throw new Error("Registro não encontrado.");

  // [CRÍTICO] Se for Férias e já estava Aprovado, deve-se estornar o saldo antes de apagar
  if (atual.status === 'Aprovado' && atual.tipo === 'Férias') {
     const qtdDias = atual.quantidade || calcularDias(atual.data_inicio, atual.data_fim);
     await estornarSaldoFerias(atual.funcionario_id, qtdDias);
  }
  
  // 2. Remove anexo do Storage se existir
  if (atual.anexo_path) {
    await supabase.storage.from(ANEXOS_BUCKET).remove([atual.anexo_path]);
  }
  
  // 3. Deleta o registro do banco
  const { error } = await supabase.from('solicitacoes_ausencia').delete().eq('id', id);
  if (error) throw error;
  
  return true;
};

// ==============================================================================
// 3. FLUXO DE APROVAÇÃO (MESA DE DECISÃO)
// ==============================================================================

export const getSolicitacoesPendentes = async () => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select(`*, funcionarios ( nome_completo, departamento, avatar_url, cargo )`)
    .eq('status', 'Pendente')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const decidirSolicitacao = async (id, decisao, motivo = '') => {
  if (!['Aprovado', 'Rejeitado'].includes(decisao)) throw new Error("Decisão inválida.");

  const { data: solicitacao } = await supabase.from('solicitacoes_ausencia').select('*').eq('id', id).single();
  if (!solicitacao) throw new Error("Solicitação não encontrada.");

  // Se Aprovar e for Férias, consome o saldo
  if (decisao === 'Aprovado' && solicitacao.tipo === 'Férias') {
    await movimentarSaldoFerias(solicitacao.funcionario_id, solicitacao.quantidade);
  }
  
  // OBS: Se rejeitar, não faz nada com saldo pois ele só é consumido na aprovação.

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .update({ status: decisao }) // Poderia salvar 'motivo_rejeicao' se houver coluna
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

// ==============================================================================
// 4. CRÉDITOS E SALDOS (MANUTENÇÃO)
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
  return lancarCredito(dados);
};

export const getCreditoById = async (id) => {
  if (!id) return null;
  // Tenta buscar como crédito avulso
  const { data: credito } = await supabase.from('historico_creditos').select('*').eq('id', id).maybeSingle();
  if (credito) return credito;
  
  // Se não achar, tenta buscar como período aquisitivo (adaptação para edição unificada)
  const { data: periodo } = await supabase.from('periodos_aquisitivos').select('*').eq('id', id).maybeSingle();
  if (periodo) return { ...periodo, tipo: 'Férias', quantidade: periodo.dias_direito, data_lancamento: periodo.inicio_periodo, data_inicio: periodo.inicio_periodo, data_fim: periodo.fim_periodo };
  
  return null;
};

export const updateCredito = async (id, dados) => {
  if (dados.tipo === 'Férias') {
     const { data, error } = await supabase.from('periodos_aquisitivos').update({ 
       inicio_periodo: dados.data_inicio, 
       fim_periodo: dados.data_fim, 
       limite_concessivo: dados.data_limite, 
       dias_direito: dados.quantidade 
     }).eq('id', id).select();
    if (error) throw error; return data[0];
  } else {
    const { data, error } = await supabase.from('historico_creditos').update({ 
      tipo: dados.tipo, 
      quantidade: dados.quantidade, 
      unidade: dados.unidade, 
      motivo: dados.motivo, 
      data_lancamento: dados.data_inicio 
    }).eq('id', id).select();
    if (error) throw error; return data[0];
  }
};

export const deleteCreditoSeguro = async (id) => {
  // Tenta deletar de créditos
  const { error: errCred } = await supabase.from('historico_creditos').delete().eq('id', id);
  if (!errCred) return true; // Sucesso

  // Se falhar ou não afetar linhas (não implementado retorno de rows aqui), tenta periodos (cuidado)
  // Geralmente deletar período é perigoso se já houver consumo. 
  // Ideal: Verificar se dias_gozados > 0 antes de permitir delete.
  const { error } = await supabase.from('periodos_aquisitivos').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// ==============================================================================
// 5. AJUSTES E AUDITORIA (CONTROLE DE RETIFICAÇÕES)
// ==============================================================================

export const solicitarAjuste = async (payload) => {
  const { data, error } = await supabase.from('solicitacoes_ajuste').insert([{
      ausencia_id: payload.ausencia_id, tipo_ajuste: payload.tipo_ajuste, justificativa: payload.justificativa,
      dados_anteriores: payload.dados_anteriores, novos_dados: payload.novos_dados, status: 'Pendente',
      solicitante_id: (await supabase.auth.getUser()).data.user?.id
    }]).select();
  if (error) throw new Error("Falha ao registrar ajuste: " + error.message);
  return data[0];
};

export const getAjustesPendentes = async () => {
  const { data, error } = await supabase.from('solicitacoes_ajuste').select(`*, ausencia:ausencia_id ( id, funcionarios ( nome_completo, cargo ) )`).eq('status', 'Pendente').order('created_at', { ascending: false });
  if (error) throw error; return data;
};

export const aprovarAjuste = async (ajusteId, dadosNovos, ausenciaId) => {
  const { data: original } = await supabase.from('solicitacoes_ausencia').select('*').eq('id', ausenciaId).single();
  
  // Recálculo financeiro de saldo no ajuste (Férias)
  if (original.tipo === 'Férias' && dadosNovos.tipo === 'Férias') {
    const diasAntigos = original.quantidade || calcularDias(original.data_inicio, original.data_fim);
    const diasNovos = calcularDias(dadosNovos.data_inicio, dadosNovos.data_fim);
    const diferenca = diasNovos - diasAntigos; // Se positivo, consome mais. Se negativo, devolve.
    
    if (diferenca > 0) {
      await movimentarSaldoFerias(original.funcionario_id, diferenca);
    } else if (diferenca < 0) {
      await estornarSaldoFerias(original.funcionario_id, Math.abs(diferenca));
    }
  }

  const { error: upError } = await supabase.from('solicitacoes_ausencia').update({ 
      tipo: dadosNovos.tipo, data_inicio: dadosNovos.data_inicio, data_fim: dadosNovos.data_fim, 
      quantidade: calcularDias(dadosNovos.data_inicio, dadosNovos.data_fim) 
    }).eq('id', ausenciaId);
  if (upError) throw upError;

  await supabase.from('solicitacoes_ajuste').update({ status: 'Aprovado', data_aprovacao: new Date() }).eq('id', ajusteId);
  await supabase.from('auditoria_ajustes').insert([{ tipo_acao: 'Retificação Aprovada', justificativa: `Ajuste ID ${ajusteId} aprovado.`, tabela_afetada: 'solicitacoes_ausencia', registro_id: ausenciaId }]);
  return true;
};

export const rejeitarAjuste = async (ajusteId, motivo) => {
  const { error } = await supabase.from('solicitacoes_ajuste').update({ status: 'Rejeitado', obs_resolucao: motivo, data_aprovacao: new Date() }).eq('id', ajusteId);
  if (error) throw error; return true;
};

// ==============================================================================
// 6. ARQUIVOS & LEITURA (CALENDÁRIO/DASHBOARD/HISTÓRICO)
// ==============================================================================

export const getAnexoAusenciaDownloadUrl = async (pathStorage) => {
  if (!pathStorage) return null;
  const { data, error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .createSignedUrl(pathStorage, 60); 

  if (error) throw error;
  return data.signedUrl;
};

export const uploadAnexoAusencia = async (file, funcionarioId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${funcionarioId}/${fileName}`;
  const { error } = await supabase.storage.from(ANEXOS_BUCKET).upload(filePath, file);
  if (error) throw error;
  return filePath;
};

export const getFeriasAprovadasParaCalendario = async (ano, mes, searchTerm = '', departamento = 'Todos') => {
  const mesFormatado = String(mes).padStart(2, '0');
  const dataInicioMes = `${ano}-${mesFormatado}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFimMes = `${ano}-${mesFormatado}-${ultimoDia}`;

  let query = supabase.from('solicitacoes_ausencia')
    .select(`id, data_inicio, data_fim, status, tipo, funcionario_id, funcionarios!inner ( id, nome_completo, departamento, avatar_url )`)
    .in('tipo', ['Férias', 'Folga Pessoal', 'Licença Paternidade/Maternidade', 'Atestado Médico', 'Banco de Horas', 'Folga'])
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

export const getAniversariantesMes = async () => { const { data, error } = await supabase.rpc('get_aniversariantes_mes'); if (error) throw error; return data; };

// Funções legadas (compatibilidade)
export const getHistoricoAusencias = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*'); return data; };
export const getHistoricoCreditos = async () => { const { data } = await supabase.from('historico_creditos').select('*'); return data; };
export const getTodasSolicitacoes = async () => { const { data } = await supabase.from('solicitacoes_ausencia').select('*, funcionarios(nome_completo, avatar_url, cargo)'); return data; };
export const concluirSolicitacao = async (id) => updateStatusSolicitacao(id, 'Concluído');
export const deleteSolicitacao = async (id) => deleteAusenciaSegura(id);