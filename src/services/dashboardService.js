import { supabase } from './supabaseClient';
import { differenceInMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Utilitário para validar o ID da empresa
 */
const validarEmpresaId = (id) => {
  if (!id || typeof id !== 'string') return null;
  if (id === 'todas') return null;
  if (id.includes('get') || id.includes('Object')) return null;
  return id;
};

// --- KPI 1: Indicadores Gerais (Topo do Dashboard) ---
export const getDashboardKPIs = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);

  // CORREÇÃO: Removidas colunas especulativas (salario_base, salario).
  // Usa apenas salario_bruto que é garantido pelo seu formulário.
  let queryFunc = supabase
    .from('funcionarios')
    .select('salario_bruto, empresa_id', { count: 'exact' })
    .eq('status', 'Ativo');

  let queryAus = supabase.from('solicitacoes_ausencia')
    .select('funcionario_id, funcionarios!inner(empresa_id)')
    .eq('status', 'Aprovado')
    .lte('data_inicio', new Date().toISOString())
    .gte('data_fim', new Date().toISOString());

  let queryPend = supabase.from('solicitacoes_ausencia')
    .select('funcionario_id, funcionarios!inner(empresa_id)')
    .eq('status', 'Pendente');

  if (empresaId) {
    queryFunc = queryFunc.eq('empresa_id', empresaId);
    queryAus = queryAus.eq('funcionarios.empresa_id', empresaId);
    queryPend = queryPend.eq('funcionarios.empresa_id', empresaId);
  }

  try {
    const [resFunc, resAus, resPend] = await Promise.all([queryFunc, queryAus, queryPend]);

    const funcionarios = resFunc.data || [];
    const totalAtivos = resFunc.count || 0;
    
    // Soma simples e segura
    const folhaReal = funcionarios.reduce((acc, curr) => {
      return acc + (Number(curr.salario_bruto) || 0);
    }, 0);

    return {
      ausentes_hoje: resAus.data?.length || 0,
      pendentes: resPend.data?.length || 0,
      total_colaboradores: totalAtivos,
      folha_pagamento: folhaReal
    };
  } catch (error) {
    console.error("Erro KPIs Gerais:", error);
    return { ausentes_hoje: 0, pendentes: 0, total_colaboradores: 0, folha_pagamento: 0 };
  }
};

// --- KPI 2: Estratégicos (Gráficos e Cards Inferiores) ---
export const getKPIsEstrategicos = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const hoje = new Date();
  const primeiroDia = startOfMonth(hoje).toISOString();
  const ultimoDia = endOfMonth(hoje).toISOString();

  // 1. Busca Funcionários
  let funcionarios = [];
  try {
    // CORREÇÃO: Apenas colunas existentes
    let q = supabase
      .from('funcionarios')
      .select('id, data_admissao, departamento, status, salario_bruto, empresa_id')
      .eq('status', 'Ativo');
    
    if (empresaId) q = q.eq('empresa_id', empresaId);
    
    const { data } = await q;
    funcionarios = data || [];
  } catch (err) {
    console.error("Erro ao buscar funcionários para KPIs:", err);
  }

  // 2. Busca Desligamentos
  let demissoes = 0;
  try {
    let qMov = supabase
      .from('movimentacoes')
      .select('id_funcionario, funcionarios!inner(empresa_id)')
      .eq('tipo', 'Desligamento')
      .gte('created_at', primeiroDia)
      .lte('created_at', ultimoDia);

    if (empresaId) qMov = qMov.eq('funcionarios.empresa_id', empresaId);
    
    const { data, error } = await qMov;
    if (!error) {
      demissoes = data?.length || 0;
    } else {
      // Fallback sem join se der erro de relação
      let qSimples = supabase.from('movimentacoes').select('id', { count: 'exact', head: true }).eq('tipo', 'Desligamento').gte('created_at', primeiroDia);
      const { count } = await qSimples;
      demissoes = count || 0;
    }
  } catch (err) {
    console.error("Erro Turnover:", err);
  }

  // Cálculos
  const totalAtivos = funcionarios.length;
  const admissoes = funcionarios.filter(f => f.data_admissao >= primeiroDia && f.data_admissao <= ultimoDia).length;
  const turnover = totalAtivos > 0 ? (((admissoes + demissoes) / 2) / totalAtivos) * 100 : 0;

  // Tempo Médio
  let somaMesesCasa = 0;
  funcionarios.forEach(f => {
    if (f.data_admissao) {
      try {
        const meses = differenceInMonths(hoje, parseISO(f.data_admissao));
        somaMesesCasa += Math.max(0, meses);
      } catch (e) {}
    }
  });
  const tempoMedioAnos = totalAtivos > 0 ? (somaMesesCasa / totalAtivos / 12).toFixed(1) : 0;

  // Ticket Médio
  const totalSalario = funcionarios.reduce((acc, curr) => acc + (Number(curr.salario_bruto) || 0), 0);
  const ticketMedio = totalAtivos > 0 ? totalSalario / totalAtivos : 0;

  // Deptos
  const porDepartamento = funcionarios.reduce((acc, curr) => {
    let depto = curr.departamento || 'Geral';
    depto = depto.trim() === '' ? 'Geral' : depto;
    acc[depto] = (acc[depto] || 0) + 1;
    return acc;
  }, {});

  const dadosGraficoPizza = Object.entries(porDepartamento)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    turnover: turnover.toFixed(1),
    admissoes_mes: admissoes,
    demissoes_mes: demissoes,
    tempo_medio: tempoMedioAnos,
    ticket_medio: ticketMedio,
    grafico_deptos: dadosGraficoPizza
  };
};

// --- KPI 3: Histórico e Evolução ---
export const getHistoricoKPIs = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  let historico = [];

  try {
    let query = supabase.from('historico_kpis').select('*').order('data_referencia', { ascending: true }).limit(12);
    const { data } = await query;
    historico = data || [];
  } catch (err) {
    // Silencioso se tabela não existir
  }

  // Adiciona Mês Atual "Live"
  try {
    const dadosAtuais = await getDashboardKPIs(empresaId);
    const pontoAtual = {
      data_referencia: new Date().toISOString(),
      total_folha: dadosAtuais.folha_pagamento,
      total_colaboradores: dadosAtuais.total_colaboradores,
      id: 'current-live'
    };

    const ultimoHistorico = historico[historico.length - 1];
    const mesAtual = new Date().getMonth();
    
    let mesUltimo = -1;
    if (ultimoHistorico && ultimoHistorico.data_referencia) {
      mesUltimo = new Date(ultimoHistorico.data_referencia).getMonth();
    }

    if (mesUltimo !== mesAtual) {
      historico.push(pontoAtual);
    } else {
      historico[historico.length - 1] = { ...ultimoHistorico, ...pontoAtual };
    }
  } catch (e) {
    console.error("Erro ao gerar ponto live do histórico", e);
  }

  return historico.map(d => ({
    ...d,
    total_folha: Number(d.total_folha) || 0,
    total_colaboradores: Number(d.total_colaboradores) || 0
  }));
};

export const getProximasFerias = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const hoje = new Date().toISOString();

  let query = supabase
    .from('solicitacoes_ausencia')
    .select('data_inicio, funcionario_id, funcionarios!inner(nome_completo, avatar_url, empresa_id)')
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .gte('data_inicio', hoje)
    .order('data_inicio', { ascending: true })
    .limit(5);

  if (empresaId) {
    query = query.eq('funcionarios.empresa_id', empresaId);
  }

  const { data } = await query;
  return (data || []).map(item => ({
    data_inicio: item.data_inicio,
    funcionario_id: item.funcionarios || item.funcionario_id
  }));
};

export const getAniversariantesMes = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const mesAtual = new Date().getMonth() + 1;

  try {
    const { data: dataRPC, error } = await supabase.rpc('get_aniversariantes_mes');
    if (!error && dataRPC) return dataRPC;
  } catch(e) {}

  let query = supabase
    .from('funcionarios')
    .select('id, nome_completo, cargo, avatar_url, data_nascimento, empresa_id')
    .eq('status', 'Ativo')
    .not('data_nascimento', 'is', null);

  if (empresaId) query = query.eq('empresa_id', empresaId);

  const { data } = await query;
  if (!data) return [];

  return data.filter(f => {
    if (!f.data_nascimento || !f.data_nascimento.includes('-')) return false;
    const parts = f.data_nascimento.split('-');
    return parseInt(parts[1], 10) === mesAtual;
  }).map(f => ({
    ...f,
    dia_aniversario: f.data_nascimento.split('-')[2]
  })).sort((a, b) => parseInt(a.dia_aniversario) - parseInt(b.dia_aniversario));
};