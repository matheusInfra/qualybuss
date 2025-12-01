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
 * Busca TODAS as movimentações recentes (com join para pegar nomes e avatares)
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

  if (error) {
    console.error("Erro ao buscar todas as movimentações:", error.message);
    throw error;
  }
  return data;
};

/**
 * Cria um novo registro de movimentação E atualiza o cadastro do funcionário.
 * Agora suporta Transferência de Empresa e Departamento.
 */
export const createMovimentacao = async (dadosMovimentacao) => {
  // 1. Grava o registro histórico
  const { data: movData, error: movError } = await supabase
    .from('movimentacoes')
    .insert([dadosMovimentacao])
    .select()
    .single();
  
  if (movError) {
    console.error("Erro ao criar movimentação:", movError.message);
    throw movError;
  }

  // 2. ATUALIZAÇÃO SINCRONIZADA DO FUNCIONÁRIO
  // Monta o objeto de update dinamicamente
  const updates = {};
  
  // Mudança de Cargo
  if (dadosMovimentacao.cargo_novo) {
    updates.cargo = dadosMovimentacao.cargo_novo;
  }
  
  // Mudança de Salário
  if (dadosMovimentacao.salario_novo) {
    updates.salario_bruto = parseFloat(dadosMovimentacao.salario_novo);
  }

  // Mudança de Departamento (Novo)
  if (dadosMovimentacao.departamento_novo) {
    updates.departamento = dadosMovimentacao.departamento_novo;
  }

  // Mudança de Empresa (Novo)
  if (dadosMovimentacao.empresa_nova) {
    updates.empresa_id = dadosMovimentacao.empresa_nova;
  }

  // Se detectou alterações relevantes, executa o update no cadastro
  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('funcionarios')
      .update(updates)
      .eq('id', dadosMovimentacao.id_funcionario);

    if (updateError) {
      console.error("ALERTA CRÍTICO: Movimentação salva, mas falha ao atualizar cadastro:", updateError.message);
      throw new Error("Movimentação registrada, mas houve erro ao atualizar o cadastro do funcionário.");
    }
  }

  return movData;
};

// src/services/movimentacaoService.js
// ... (código existente mantido)

/**
 * [NOVO] Aplica um reajuste salarial em massa (Dissídio)
 * @param {string} departamento - Nome do departamento ou 'Todos'
 * @param {number} percentual - Ex: 5.5 (para 5.5%)
 * @param {string} dataVigencia - Data da movimentação
 * @param {string} descricao - Ex: "Dissídio 2025"
 */
export const aplicarDissidioEmMassa = async ({ departamento, percentual, dataVigencia, descricao }) => {
  // 1. Buscar funcionários elegíveis
  let query = supabase.from('funcionarios').select('id, nome_completo, salario_bruto, cargo, departamento');
  
  if (departamento && departamento !== 'Todos') {
    query = query.eq('departamento', departamento);
  }
  
  const { data: funcionarios, error: errBusca } = await query;
  if (errBusca) throw errBusca;

  if (!funcionarios || funcionarios.length === 0) {
    return { total: 0, message: "Nenhum funcionário encontrado para este filtro." };
  }

  // 2. Preparar as movimentações em lote
  const fator = 1 + (percentual / 100);
  
  // Como o Supabase não suporta "Transaction" via JS client facilmente para múltiplos updates distintos,
  // faremos um loop de Promises. Para 50-100 funcionários é rápido. Para 1000+, ideal seria uma RPC (banco).
  
  const promises = funcionarios.map(async (func) => {
    const novoSalario = parseFloat((func.salario_bruto * fator).toFixed(2));
    
    // Reaproveita sua função createMovimentacao que já atualiza o cadastro!
    return createMovimentacao({
      id_funcionario: func.id,
      tipo: 'Ajuste Salarial', // ou 'Dissídio'
      data_movimentacao: dataVigencia,
      descricao: `${descricao} (${percentual}%)`,
      cargo_anterior: func.cargo,
      cargo_novo: func.cargo, // Cargo não muda
      salario_anterior: func.salario_bruto,
      salario_novo: novoSalario,
      // Manter empresa/departamento iguais
      empresa_anterior: null, // Opcional buscar se necessário
      empresa_nova: null,
      departamento_anterior: func.departamento,
      departamento_novo: func.departamento
    });
  });

  await Promise.all(promises);

  return { total: funcionarios.length, message: `Reajuste aplicado para ${funcionarios.length} colaboradores.` };
};