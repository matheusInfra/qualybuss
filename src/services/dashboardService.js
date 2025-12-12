import { supabase } from './supabaseClient';
import { differenceInMonths, parseISO } from 'date-fns';

/**
 * Utilitário para validar o ID da empresa e evitar injeção de strings inválidas
 */
const validarEmpresaId = (id) => {
  if (!id || typeof id !== 'string') return null;
  if (id === 'todas') return null;
  // Se parecer nome de função ou algo errado, ignora
  if (id.includes('get') || id.includes('Object')) return null;
  return id;
};

export const getDashboardKPIs = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);

  let queryFunc = supabase.from('funcionarios').select('salario_bruto, empresa_id', { count: 'exact' }).eq('status', 'Ativo');

  // Para KPIs de Ausência/Pendência, a filtragem por relação é mais segura feita em duas etapas ou garantindo a sintaxe correta
  // Aqui buscamos todos e filtramos no JS para evitar erros de Foreign Key se a relação não estiver perfeita no banco
  let queryAus = supabase.from('solicitacoes_ausencia').select('funcionario_id, funcionarios!inner(empresa_id)').eq('status', 'Aprovado').lte('data_inicio', new Date().toISOString()).gte('data_fim', new Date().toISOString());
  let queryPend = supabase.from('solicitacoes_ausencia').select('funcionario_id, funcionarios!inner(empresa_id)').eq('status', 'Pendente');

  if (empresaId) {
    queryFunc = queryFunc.eq('empresa_id', empresaId);
    // Nota: O filtro nas queries de relação (inner) já restringe os resultados
    queryAus = queryAus.eq('funcionarios.empresa_id', empresaId);
    queryPend = queryPend.eq('funcionarios.empresa_id', empresaId);
  }

  const [resFunc, resAus, resPend] = await Promise.all([queryFunc, queryAus, queryPend]);

  const funcionarios = resFunc.data || [];
  const totalAtivos = resFunc.count || 0;
  const folhaReal = funcionarios.reduce((acc, curr) => acc + (Number(curr.salario_bruto) || 0), 0);

  return {
    ausentes_hoje: resAus.data?.length || 0,
    pendentes: resPend.data?.length || 0,
    total_colaboradores: totalAtivos,
    folha_pagamento: folhaReal
  };
};

export const getKPIsEstrategicos = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const hoje = new Date();
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString();

  let queryFunc = supabase.from('funcionarios').select('id, data_admissao, departamento, status, salario_bruto, empresa_id').eq('status', 'Ativo');

  // Busca desligamentos
  let queryMov = supabase
    .from('movimentacoes')
    .select('id_funcionario, funcionarios!inner(empresa_id)')
    .eq('tipo', 'Desligamento')
    .gte('data_movimentacao', primeiroDiaMes)
    .lte('data_movimentacao', ultimoDiaMes);

  if (empresaId) {
    queryFunc = queryFunc.eq('empresa_id', empresaId);
    queryMov = queryMov.eq('funcionarios.empresa_id', empresaId);
  }

  const [resFunc, resMov] = await Promise.all([queryFunc, queryMov]);

  const funcionarios = resFunc.data || [];
  const demissoes = resMov.data?.length || 0;
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
    grafico_deptos: dadosGraficoPizza || []
  };
};

export const getHistoricoKPIs = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  let query = supabase.from('historico_kpis').select('*').order('data_referencia', { ascending: true }).limit(30);

  // Se tiver coluna empresa_id na tabela de historico, descomente a linha abaixo
  // if (empresaId) query = query.eq('empresa_id', empresaId);

  const { data } = await query;
  // Garante que valores numéricos sejam números reais para o Recharts não quebrar
  return data?.map(d => ({
    ...d,
    total_folha: Number(d.total_folha) || 0,
    total_colaboradores: Number(d.total_colaboradores) || 0
  })) || [];
};

export const getProximasFerias = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const hoje = new Date().toISOString();

  let query = supabase
    .from('solicitacoes_ausencia')
    .select('data_inicio, funcionario_id:funcionarios!inner(nome_completo, avatar_url, empresa_id)')
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .gte('data_inicio', hoje)
    .order('data_inicio', { ascending: true })
    .limit(5);

  if (empresaId) {
    query = query.eq('funcionarios.empresa_id', empresaId);
  }

  const { data } = await query;
  return data || [];
};

export const getAniversariantesMes = async (empresaIdRaw = null) => {
  const empresaId = validarEmpresaId(empresaIdRaw);
  const mesAtual = new Date().getMonth() + 1;

  let query = supabase
    .from('funcionarios')
    .select('id, nome_completo, cargo, avatar_url, data_nascimento, empresa_id')
    .eq('status', 'Ativo')
    .not('data_nascimento', 'is', null);

  if (empresaId) {
    query = query.eq('empresa_id', empresaId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar aniversariantes:", error);
    return [];
  }

  return data.filter(f => {
    // Valida formato da data antes de splitar
    if (!f.data_nascimento || !f.data_nascimento.includes('-')) return false;
    const parts = f.data_nascimento.split('-');
    return parseInt(parts[1], 10) === mesAtual;
  }).map(f => ({
    ...f,
    dia_aniversario: f.data_nascimento.split('-')[2]
  })).sort((a, b) => parseInt(a.dia_aniversario) - parseInt(b.dia_aniversario));
};