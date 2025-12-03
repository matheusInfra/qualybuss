// src/services/movimentacaoService.js
import { supabase } from './supabaseClient';

/**
 * Busca o histórico de movimentações de um funcionário específico.
 */
export const getMovimentacoesPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select('*')
    .eq('id_funcionario', funcionarioId)
    .order('data_movimentacao', { ascending: false });

  if (error) {
    console.error("Erro ao buscar movimentações:", error.message);
    throw error;
  }
  return data;
};

/**
 * [LEGADO] Busca TODAS as movimentações recentes (sem filtro)
 */
export const getTodasMovimentacoes = async () => {
  const { data, error } = await supabase
    .from('movimentacoes')
    .select(`
      *,
      funcionarios ( nome_completo, avatar_url ) 
    `) 
    .order('data_movimentacao', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
};

/**
 * [NOVO] Busca Avançada com Filtros
 * Permite analisar por período, tipo e colaborador específico.
 */
export const getMovimentacoesFiltradas = async ({ funcionarioId, tipo, dataInicio, dataFim }) => {
  let query = supabase
    .from('movimentacoes')
    .select(`
      *,
      funcionarios ( nome_completo, avatar_url )
    `)
    .order('data_movimentacao', { ascending: false });

  // Aplicação Dinâmica de Filtros
  if (funcionarioId) {
    query = query.eq('id_funcionario', funcionarioId);
  }
  if (tipo && tipo !== 'Todos') {
    query = query.eq('tipo', tipo);
  }
  if (dataInicio) {
    query = query.gte('data_movimentacao', dataInicio);
  }
  if (dataFim) {
    query = query.lte('data_movimentacao', dataFim);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Erro ao filtrar movimentações:", error.message);
    throw error;
  }
  return data;
};

export const createMovimentacao = async (dados) => {
  // Prepara os dados para a função SQL
  // Enviamos apenas o que é novo. O que for null/undefined, a SQL mantém o atual.
  const payload = {
    p_funcionario_id: dados.id_funcionario,
    p_tipo: dados.tipo,
    p_data: dados.data_movimentacao,
    p_descricao: dados.descricao,
    p_cargo_novo: dados.cargo_novo || null,
    p_salario_novo: dados.salario_novo ? parseFloat(dados.salario_novo) : null,
    p_departamento_novo: dados.departamento_novo || null,
    p_empresa_nova: dados.empresa_nova || null
  };

  const { data, error } = await supabase.rpc('registrar_movimentacao_segura', payload);

  if (error) {
    console.error("Erro na movimentação:", error.message);
    // Tratamento de erro amigável para a regra CLT
    if (error.message.includes('Irredutibilidade')) {
        throw new Error("Ação bloqueada: Não é permitido reduzir o salário do colaborador.");
    }
    throw error;
  }

  return data;
};
export const simularReajusteMassa = async ({ departamento, tipoReajuste, valor, dataVigencia }) => {
  let query = supabase.from('funcionarios').select('id, nome_completo, salario_bruto, cargo, departamento, empresa_id').eq('status', 'Ativo');
  
  if (departamento && departamento !== 'Todos') {
    query = query.eq('departamento', departamento);
  }
  
  const { data: funcionarios, error } = await query;
  if (error) throw error;

  if (!funcionarios.length) return [];

  const simulacao = funcionarios.map(func => {
    let novoSalario = Number(func.salario_bruto);
    const salarioAtual = Number(func.salario_bruto);

    if (tipoReajuste === 'Porcentagem') {
      novoSalario = salarioAtual * (1 + (valor / 100));
    } else if (tipoReajuste === 'Valor Fixo') {
      novoSalario = salarioAtual + valor;
    } else if (tipoReajuste === 'Novo Piso') {
      if (salarioAtual < valor) novoSalario = valor;
    }

    return {
      id: func.id,
      nome: func.nome_completo,
      cargo: func.cargo,
      salario_atual: salarioAtual,
      novo_salario: parseFloat(novoSalario.toFixed(2)),
      diferenca: parseFloat((novoSalario - salarioAtual).toFixed(2)),
      empresa_id: func.empresa_id,
      departamento: func.departamento
    };
  });

  return simulacao.filter(item => item.diferenca > 0);
};

/**
 * [MÓDULO AVANÇADO] Aplica o reajuste confirmado.
 */
export const aplicarReajusteMassa = async (listaAprovada, motivo, dataVigencia) => {
  const user = (await supabase.auth.getUser()).data.user;

  const promises = listaAprovada.map(async (item) => {
    // 1. Cria Movimentação
    const { error: movError } = await supabase.from('movimentacoes').insert([{
      id_funcionario: item.id,
      data_movimentacao: dataVigencia,
      tipo: 'Reajuste Coletivo',
      descricao: motivo,
      cargo_anterior: item.cargo,
      cargo_novo: item.cargo,
      salario_anterior: item.salario_atual,
      salario_novo: item.novo_salario
    }]);
    if (movError) throw movError;

    // 2. Atualiza Funcionário
    const { error: funcError } = await supabase.from('funcionarios').update({
      salario_bruto: item.novo_salario
    }).eq('id', item.id);
    if (funcError) throw funcError;
  });

  await Promise.all(promises);

  // 3. Auditoria
  await supabase.from('auditoria_ajustes').insert([{
    tipo_acao: 'Reajuste em Massa',
    justificativa: `${motivo}. Afetou ${listaAprovada.length} colaboradores.`,
    tabela_afetada: 'funcionarios',
    usuario_responsavel: user?.id
  }]);

  return true;
};