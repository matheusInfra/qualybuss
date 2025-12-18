import { supabase } from './supabaseClient';
import { differenceInMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Valida se o ID da empresa é válido para filtros.
 */
const validarEmpresaId = (id) => {
  if (!id || typeof id !== 'string') return null;
  if (id === 'todas') return null;
  if (id.includes('get') || id.includes('Object')) return null;
  return id;
};

/**
 * Retorna a data atual no formato YYYY-MM-DD considerando o fuso horário local.
 * Essencial para comparar com colunas do tipo 'date' no Postgres.
 */
const getHojeLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

/**
 * KPI 1: Indicadores Gerais (Topo do Dashboard)
 */
export const getDashboardKPIs = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const hoje = getHojeLocal();

  // 1. Funcionários Ativos e Folha
  let queryFunc = supabase
    .from('funcionarios')
    .select('salario_bruto, empresa_id', { count: 'exact' })
    .eq('status', 'Ativo');

  // 2. Ausentes Hoje (Lógica Corrigida de Data)
  // Conta registros Aprovados onde Hoje está entre Inicio e Fim
  let queryAus = supabase.from('solicitacoes_ausencia')
    .select('id, funcionario_id, funcionarios!inner(empresa_id)', { count: 'exact' })
    .eq('status', 'Aprovado')
    .lte('data_inicio', hoje)
    .gte('data_fim', hoje);

  // 3. Pendências
  let queryPend = supabase.from('solicitacoes_ausencia')
    .select('id, funcionario_id, funcionarios!inner(empresa_id)', { count: 'exact' })
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
    
    const folhaReal = funcionarios.reduce((acc, curr) => {
      return acc + (Number(curr.salario_bruto) || 0);
    }, 0);

    return {
      ausentes_hoje: resAus.count || 0,
      pendentes: resPend.count || 0,
      total_colaboradores: totalAtivos,
      folha_pagamento: folhaReal
    };
  } catch (error) {
    console.error("Erro ao buscar KPIs gerais:", error);
    return { ausentes_hoje: 0, pendentes: 0, total_colaboradores: 0, folha_pagamento: 0 };
  }
};

/**
 * KPI 2: Indicadores Estratégicos (Turnover, Tempo de Casa, Tickets)
 */
export const getKPIsEstrategicos = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const hoje = new Date();
  const primeiroDia = startOfMonth(hoje).toISOString();
  const ultimoDia = endOfMonth(hoje).toISOString();

  // Dados para cálculos demográficos
  let funcionarios = [];
  try {
    let q = supabase
      .from('funcionarios')
      .select('id, data_admissao, departamento, status, salario_bruto, empresa_id')
      .eq('status', 'Ativo');
    
    if (empresaId) q = q.eq('empresa_id', empresaId);
    
    const { data } = await q;
    funcionarios = data || [];
  } catch (err) {
    console.error("Erro KPIs Estratégicos:", err);
  }

  // Dados de Turnover (Desligamentos no Mês)
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
      // Fallback para contagem simples se o join falhar
      let qSimples = supabase.from('movimentacoes')
        .select('id', { count: 'exact', head: true })
        .eq('tipo', 'Desligamento')
        .gte('created_at', primeiroDia);
      const { count } = await qSimples;
      demissoes = count || 0;
    }
  } catch (err) {}

  // Cálculos
  const totalAtivos = funcionarios.length;
  const admissoes = funcionarios.filter(f => f.data_admissao >= primeiroDia && f.data_admissao <= ultimoDia).length;
  const turnover = totalAtivos > 0 ? (((admissoes + demissoes) / 2) / totalAtivos) * 100 : 0;

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

  const totalSalario = funcionarios.reduce((acc, curr) => acc + (Number(curr.salario_bruto) || 0), 0);
  const ticketMedio = totalAtivos > 0 ? totalSalario / totalAtivos : 0;

  // Gráfico de Pizza
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

/**
 * KPI 3: Histórico e Evolução da Folha
 */
export const getHistoricoKPIs = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  let historico = [];

  try {
    const { data } = await supabase.from('historico_kpis').select('*').order('data_referencia', { ascending: true }).limit(12);
    historico = data || [];
  } catch (err) {}

  // Adiciona o mês atual "Ao Vivo" para o gráfico não ficar defasado
  try {
    const dadosAtuais = await getDashboardKPIs(empresaId);
    const pontoAtual = {
      data_referencia: new Date().toISOString(),
      total_folha: dadosAtuais.folha_pagamento,
      total_colaboradores: dadosAtuais.total_colaboradores,
      id: 'live-current'
    };

    const ultimoHistorico = historico[historico.length - 1];
    const mesAtual = new Date().getMonth();
    const mesUltimo = ultimoHistorico ? new Date(ultimoHistorico.data_referencia).getMonth() : -1;

    if (mesUltimo === mesAtual) {
      historico[historico.length - 1] = { ...ultimoHistorico, ...pontoAtual };
    } else {
      historico.push(pontoAtual);
    }
  } catch (e) {}

  return historico.map(d => ({
    ...d,
    total_folha: Number(d.total_folha) || 0,
    total_colaboradores: Number(d.total_colaboradores) || 0
  }));
};

/**
 * KPI 4: Próximas Férias
 */
export const getProximasFerias = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const hoje = getHojeLocal();

  let query = supabase
    .from('solicitacoes_ausencia')
    .select('data_inicio, funcionario_id, funcionarios!inner(nome_completo, avatar_url, empresa_id)')
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

/**
 * KPI 5: Aniversariantes do Mês
 */
export const getAniversariantesMes = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const mesAtual = new Date().getMonth() + 1;

  try {
    // Tenta usar RPC (Stored Procedure) se existir
    const { data: dataRPC, error } = await supabase.rpc('get_aniversariantes_mes');
    if (!error && dataRPC) return dataRPC;
  } catch(e) {}

  // Fallback: Filtro manual via Javascript
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