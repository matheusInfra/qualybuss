// src/services/dashboardService.js
import { supabase } from './supabaseClient';

/**
 * Busca os KPIs principais.
 * CORREÇÃO: Calcula Total e Folha manualmente filtrando por 'Ativo'
 * para ignorar funcionários desligados.
 */
export const getDashboardKPIs = async () => {
  // 1. Busca KPIs complexos (Ausentes e Pendentes) via RPC
  // Mantemos a RPC para esses pois envolvem lógica de datas/tabelas cruzadas
  const { data: kpisRPC, error: errorRPC } = await supabase.rpc('get_dashboard_kpis');
  
  if (errorRPC) {
    console.warn("Aviso: Falha ao carregar KPIs via RPC, tentando fallback manual.", errorRPC.message);
  }

  // 2. Busca TOTAL DE COLABORADORES (Apenas Ativos)
  const { count: totalAtivos, error: errorCount } = await supabase
    .from('funcionarios')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Ativo'); // <--- O filtro que faltava

  if (errorCount) throw errorCount;

  // 3. Busca FOLHA DE PAGAMENTO (Apenas Ativos)
  const { data: salarios, error: errorSalarios } = await supabase
    .from('funcionarios')
    .select('salario_bruto')
    .eq('status', 'Ativo'); // <--- O filtro que faltava

  if (errorSalarios) throw errorSalarios;

  // Soma os salários
  const folhaReal = salarios?.reduce((acc, curr) => acc + (Number(curr.salario_bruto) || 0), 0) || 0;

  // 4. Monta o objeto final
  // Sobrescrevemos os valores da RPC com os nossos valores filtrados e corretos
  return {
    ausentes_hoje: kpisRPC?.ausentes_hoje || 0,
    pendentes: kpisRPC?.pendentes || 0,
    total_colaboradores: totalAtivos || 0,
    folha_pagamento: folhaReal
  };
};

/**
 * Busca o histórico de KPIs.
 * Nota: O histórico antigo no banco não mudará, mas os novos registros
 * dependerão de como a procedure 'get_dashboard_kpis' salva os dados.
 */
export const getHistoricoKPIs = async () => {
  const { data, error } = await supabase
    .from('historico_kpis')
    .select('data_referencia, total_colaboradores, total_folha')
    .order('data_referencia', { ascending: true }) 
    .limit(30);

  if (error) {
    console.warn("Histórico indisponível:", error.message);
    return [];
  }
  return data;
};

/**
 * Busca as próximas férias aprovadas.
 * Adicionado filtro de status do funcionário para garantir (via inner join).
 */
export const getProximasFerias = async () => {
  const hoje = new Date().toISOString();
  const futuro = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select(`
      data_inicio,
      funcionario_id:funcionarios!inner ( nome_completo, avatar_url, status )
    `) 
    .eq('tipo', 'Férias')
    .eq('status', 'Aprovado')
    .eq('funcionarios.status', 'Ativo') // Garante que só traga de ativos
    .gte('data_inicio', hoje)
    .lte('data_inicio', futuro)
    .order('data_inicio', { ascending: true })
    .limit(5);

  if (error) {
    console.error("Erro ao buscar próximas férias:", error.message);
    throw error;
  }
  return data;
};

/**
 * Busca aniversariantes do mês.
 * REESCRITO para filtrar por status 'Ativo' no client-side,
 * substituindo a RPC que trazia desligados.
 */
export const getAniversariantesMes = async () => {
  const mesAtual = new Date().getMonth() + 1; // 1 (Jan) a 12 (Dez)

  // Busca todos os ativos que têm data de nascimento
  const { data, error } = await supabase
    .from('funcionarios')
    .select('id, nome_completo, cargo, avatar_url, data_nascimento')
    .eq('status', 'Ativo') // <--- Filtro crucial
    .not('data_nascimento', 'is', null);
  
  if (error) throw error;

  // Filtra o mês no JavaScript
  const aniversariantes = data.filter(f => {
    const parts = f.data_nascimento.split('-'); // YYYY-MM-DD
    const mesNasc = parseInt(parts[1], 10);
    return mesNasc === mesAtual;
  }).map(f => ({
    ...f,
    dia_aniversario: f.data_nascimento.split('-')[2]
  })).sort((a, b) => parseInt(a.dia_aniversario) - parseInt(b.dia_aniversario));

  return aniversariantes;
};