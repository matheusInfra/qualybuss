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
 * Busca Avançada com Filtros (Para Dashboards e Relatórios)
 */
export const getMovimentacoesFiltradas = async ({ funcionarioId, tipo, dataInicio, dataFim }) => {
  let query = supabase
    .from('movimentacoes')
    .select(`
      *,
      funcionarios ( nome_completo, avatar_url )
    `)
    .order('data_movimentacao', { ascending: false });

  if (funcionarioId) query = query.eq('id_funcionario', funcionarioId);
  if (tipo && tipo !== 'Todos') query = query.eq('tipo', tipo);
  if (dataInicio) query = query.gte('data_movimentacao', dataInicio);
  if (dataFim) query = query.lte('data_movimentacao', dataFim);

  const { data, error } = await query;
  
  if (error) {
    console.error("Erro ao filtrar movimentações:", error.message);
    throw error;
  }
  return data;
};

/**
 * [CRÍTICO] Cria movimentação de forma ATÔMICA via RPC.
 * Substitui a lógica antiga de dois passos por uma transação segura no banco.
 */
export const createMovimentacao = async (dados) => {
  // Prepara o payload para a função SQL
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

  // Chama a função de segurança no banco
  const { data, error } = await supabase.rpc('registrar_movimentacao_segura', payload);

  if (error) {
    console.error("Erro na movimentação segura:", error.message);
    // Tratamento de erro amigável para regras de negócio do banco
    if (error.message.includes('Irredutibilidade')) {
        throw new Error("Bloqueio de Compliance: Não é permitido reduzir o salário sem justificativa legal (Acordo/Correção).");
    }
    throw error;
  }

  return data;
};

/**
 * Simula um reajuste em massa (Cálculo Prévio)
 */
export const simularReajusteMassa = async ({ departamento, tipoReajuste, valor, dataVigencia }) => {
  let query = supabase.from('funcionarios')
    .select('id, nome_completo, salario_bruto, cargo, departamento, empresa_id')
    .eq('status', 'Ativo');
  
  if (departamento && departamento !== 'Todos') {
    query = query.eq('departamento', departamento);
  }
  
  const { data: funcionarios, error } = await query;
  if (error) throw error;

  if (!funcionarios || funcionarios.length === 0) return [];

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

  // Retorna apenas quem teve alteração positiva
  return simulacao.filter(item => item.diferenca > 0);
};

/**
 * Aplica o reajuste em massa confirmado (Lote Seguro)
 */
export const aplicarReajusteMassa = async (listaAprovada, motivo, dataVigencia) => {
  // Para cada item, chama a função segura. 
  // Nota: Em grandes volumes (>500), ideal seria criar uma RPC de lote no banco, 
  // mas para o MVP este loop com Promise.all funciona bem.
  
  const promises = listaAprovada.map(async (item) => {
    const payload = {
      p_funcionario_id: item.id,
      p_tipo: 'Reajuste Coletivo',
      p_data: dataVigencia,
      p_descricao: motivo,
      p_salario_novo: item.novo_salario
      // Cargo e outros mantêm null para não alterar
    };

    return supabase.rpc('registrar_movimentacao_segura', payload);
  });

  const results = await Promise.all(promises);
  
  // Verifica se houve algum erro no lote
  const erros = results.filter(r => r.error);
  if (erros.length > 0) {
    console.error("Erros no lote:", erros);
    throw new Error(`Ocorreram ${erros.length} falhas durante o processamento do lote.`);
  }

  return true;
};