import { supabase } from './supabaseClient';
import { differenceInMonths, parseISO } from 'date-fns';

export const getDashboardKPIs = async (empresaId = null) => {
  let queryFunc = supabase.from('funcionarios').select('salario_bruto', { count: 'exact' }).eq('status', 'Ativo');
  let queryAus = supabase.from('solicitacoes_ausencia').select('funcionario_id, funcionarios!inner(empresa_id)').eq('status', 'Aprovado').lte('data_inicio', new Date().toISOString()).gte('data_fim', new Date().toISOString());
  let queryPend = supabase.from('solicitacoes_ausencia').select('funcionario_id, funcionarios!inner(empresa_id)').eq('status', 'Pendente');

  if (empresaId && empresaId !== 'todas') {
    queryFunc = queryFunc.eq('empresa_id', empresaId);
  }

  const [resFunc, resAus, resPend] = await Promise.all([queryFunc, queryAus, queryPend]);

  const funcionarios = resFunc.data || [];
  const totalAtivos = resFunc.count || 0;
  const folhaReal = funcionarios.reduce((acc, curr) => acc + (Number(curr.salario_bruto) || 0), 0);

  // Filtragem de relação segura
  const filterEmpresa = (items) => {
    if (!empresaId || empresaId === 'todas') return items?.length || 0;
    return items?.filter(i => i.funcionarios?.empresa_id === empresaId).length || 0;
  };

  return {
    ausentes_hoje: filterEmpresa(resAus.data),
    pendentes: filterEmpresa(resPend.data),
    total_colaboradores: totalAtivos,
    folha_pagamento: folhaReal
  };
};

export const getKPIsEstrategicos = async (empresaId = null) => {
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString();

  let queryFunc = supabase.from('funcionarios').select('id, data_admissao, departamento, status, salario_bruto, empresa_id').eq('status', 'Ativo');
  let queryMov = supabase.from('movimentacoes').select('id_funcionario, funcionarios!inner(empresa_id)').eq('tipo', 'Desligamento').gte('data_movimentacao', primeiroDiaMes).lte('data_movimentacao', ultimoDiaMes);

  if (empresaId && empresaId !== 'todas') {
    queryFunc = queryFunc.eq('empresa_id', empresaId);
  }

  const [resFunc, resMov] = await Promise.all([queryFunc, queryMov]);

  const funcionarios = resFunc.data || [];
  // Filtro manual de desligamentos por empresa se necessário (devido ao join)
  const demissoes = (resMov.data || []).filter(m => !empresaId || empresaId === 'todas' || m.funcionarios?.empresa_id === empresaId).length;
  
  const totalAtivos = funcionarios.length;
  const admissoes = funcionarios.filter(f => f.data_admissao >= primeiroDiaMes && f.data_admissao <= ultimoDiaMes).length;
  
  const turnover = totalAtivos > 0 ? (((admissoes + demissoes) / 2) / totalAtivos) * 100 : 0;

  let somaMesesCasa = 0;
  funcionarios.forEach(f => {
    if (f.data_admissao) somaMesesCasa += differenceInMonths(hoje, parseISO(f.data_admissao));
  });
  const tempoMedioAnos = totalAtivos > 0 ? (somaMesesCasa / totalAtivos / 12).toFixed(1) : 0;

  const totalSalario = funcionarios.reduce((acc, curr) => acc + (Number(curr.salario_bruto) || 0), 0);
  const ticketMedio = totalAtivos > 0 ? totalSalario / totalAtivos : 0;

  const porDepartamento = funcionarios.reduce((acc, curr) => {
    const depto = curr.departamento || 'Geral';
    acc[depto] = (acc[depto] || 0) + 1;
    return acc;
  }, {});

  const dadosGraficoPizza = Object.entries(porDepartamento).map(([name, value]) => ({ name, value }));

  return {
    turnover: turnover.toFixed(2),
    admissoes_mes: admissoes,
    demissoes_mes: demissoes,
    tempo_medio: tempoMedioAnos,
    ticket_medio: ticketMedio,
    grafico_deptos: dadosGraficoPizza || [] // Garante array
  };
};

export const getHistoricoKPIs = async (empresaId = null) => {
  let query = supabase.from('historico_kpis').select('*').order('data_referencia', { ascending: true }).limit(30);
  const { data } = await query;
  
  if (!data) return [];

  if (empresaId && empresaId !== 'todas') {
    return data.filter(d => d.empresa_id === empresaId);
  }
  return data;
};

export const getProximasFerias = async (empresaId = null) => {
  const hoje = new Date().toISOString();
  let query = supabase
    .from('solicitacoes_ausencia')
    .select('data_inicio, funcionario_id:funcionarios!inner(nome_completo, avatar_url, empresa_id)')
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .gte('data_inicio', hoje)
    .order('data_inicio', { ascending: true })
    .limit(5);

  const { data } = await query;
  
  if (!data) return [];
  
  if (empresaId && empresaId !== 'todas') {
    return data.filter(f => f.funcionario_id.empresa_id === empresaId);
  }
  return data;
};

export const getAniversariantesMes = async (empresaId = null) => {
  const mesAtual = new Date().getMonth() + 1;
  let query = supabase.from('funcionarios').select('id, nome_completo, cargo, avatar_url, data_nascimento, empresa_id').eq('status', 'Ativo').not('data_nascimento', 'is', null);

  if (empresaId && empresaId !== 'todas') {
    query = query.eq('empresa_id', empresaId);
  }

  const { data } = await query;
  if (!data) return [];

  return data.filter(f => {
    const parts = f.data_nascimento.split('-');
    return parseInt(parts[1], 10) === mesAtual;
  }).map(f => ({
    ...f,
    dia_aniversario: f.data_nascimento.split('-')[2]
  })).sort((a, b) => parseInt(a.dia_aniversario) - parseInt(b.dia_aniversario));
};