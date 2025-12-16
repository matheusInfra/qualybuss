import { supabase } from './supabaseClient';
import { 
  calcularINSS, 
  calcularMelhorIRRF 
} from '../utils/calculadoraSalario';

// ==============================================================================
// 1. GESTÃO DE RUBRICAS
// ==============================================================================

export const getRubricas = async () => {
  const { data, error } = await supabase.from('rubricas').select('*').order('codigo');
  if (error) throw error;
  return data;
};

export const createRubrica = async (rubrica) => {
  const { data, error } = await supabase.from('rubricas').insert([rubrica]).select();
  if (error) throw error;
  return data[0];
};

// ==============================================================================
// 2. GESTÃO DE MOVIMENTOS (LANÇAMENTOS)
// ==============================================================================

// Busca movimentos de um mês específico para a grade
export const getMovimentosCompetencia = async (competencia) => {
  const { data, error } = await supabase
    .from('movimentos_folha')
    .select('*, rubricas(codigo, nome, tipo)')
    .eq('competencia', competencia);
  if (error) throw error;
  return data;
};

// Salva um movimento individual
export const saveMovimento = async (movimento) => {
  const { data, error } = await supabase
    .from('movimentos_folha')
    .upsert(movimento, { onConflict: 'funcionario_id, rubrica_id, competencia' })
    .select();
  if (error) throw error;
  return data[0];
};

// Exclui um movimento
export const deleteMovimento = async (id) => {
  const { error } = await supabase.from('movimentos_folha').delete().eq('id', id);
  if (error) throw error;
};

// Copiar movimentos fixos do mês anterior
export const copiarMovimentosAnteriores = async (compAtual, compAnterior) => {
  // 1. Busca fixos do mês anterior
  const { data: anteriores } = await supabase
    .from('movimentos_folha')
    .select('*')
    .eq('competencia', compAnterior)
    .eq('fixo', true);

  if (!anteriores || anteriores.length === 0) return { count: 0 };

  // 2. Prepara para o mês atual
  const novos = anteriores.map(m => ({
    funcionario_id: m.funcionario_id,
    rubrica_id: m.rubrica_id,
    competencia: compAtual,
    valor: m.valor,
    referencia: m.referencia,
    fixo: true
  }));

  // 3. Insere
  const { error } = await supabase.from('movimentos_folha').insert(novos);
  if (error) throw error;
  
  return { count: novos.length };
};

// ==============================================================================
// 3. CÁLCULO DA FOLHA (MOTOR INDEPENDENTE)
// ==============================================================================

export const getConfigFolha = async () => {
  const { data } = await supabase.from('config_folha').select('*').eq('ativo', true).single();
  // Fallback se não tiver config
  return data || { 
    tabela_inss: [{limite: 1412, aliquota: 7.5, deducao: 0}, {limite: 99999, aliquota: 14, deducao: 0}], 
    tabela_irrf: [{limite: 2259, aliquota: 0, deducao: 0}, {limite: 99999, aliquota: 27.5, deducao: 896}],
    aliquota_fgts: 8, aliquota_patronal: 20, aliquota_rat: 2, deducao_por_dependente: 189.59
  };
};

export const calcularFolhaMensal = async (competencia) => {
  // 1. Busca Funcionários Ativos
  const { data: funcionarios } = await supabase.from('funcionarios').select('*').eq('status', 'Ativo');
  if (!funcionarios || funcionarios.length === 0) throw new Error("Sem funcionários ativos.");

  // 2. Busca Movimentos do Mês (Variáveis)
  const { data: movimentos } = await supabase
    .from('movimentos_folha')
    .select('*, rubricas(*)')
    .eq('competencia', competencia);

  // 3. Busca Configurações
  const config = await getConfigFolha();

  // 4. Processa Folha por Funcionário
  const folhasCalculadas = [];
  const itensParaSalvar = [];

  for (const func of funcionarios) {
    const movsFunc = movimentos?.filter(m => m.funcionario_id === func.id) || [];
    const salarioBase = parseFloat(func.salario_bruto || 0);
    
    let totalProventos = salarioBase; // Começa com o salário
    let totalDescontos = 0;
    
    // Adiciona Item Salário Base
    itensParaSalvar.push({ 
      tempId: func.id, 
      descricao: 'Salário Base', tipo: 'Provento', valor: salarioBase, referencia: 30 
    });

    // Soma Movimentos Manuais
    movsFunc.forEach(m => {
      if (m.rubricas.tipo === 'Provento') totalProventos += parseFloat(m.valor);
      else if (m.rubricas.tipo === 'Desconto') totalDescontos += parseFloat(m.valor);
      
      itensParaSalvar.push({
        tempId: func.id,
        descricao: m.rubricas.nome,
        tipo: m.rubricas.tipo,
        valor: parseFloat(m.valor),
        referencia: m.referencia
      });
    });

    // Calcula Impostos Automáticos (INSS/IRRF) sobre a base total
    const baseTributavel = totalProventos; // Ajustar se tiver descontos que abatem base (ex: faltas)
    
    const inss = calcularINSS(baseTributavel, config.tabela_inss);
    if (inss > 0) {
      totalDescontos += inss;
      itensParaSalvar.push({ tempId: func.id, descricao: 'INSS', tipo: 'Desconto', valor: inss, referencia: 0 });
    }

    const irrfObj = calcularMelhorIRRF(baseTributavel, inss, func.qtd_dependentes || 0, config);
    if (irrfObj.valor > 0) {
      totalDescontos += irrfObj.valor;
      itensParaSalvar.push({ tempId: func.id, descricao: 'IRRF', tipo: 'Desconto', valor: irrfObj.valor, referencia: 0 });
    }

    // Custos Empresa
    const fgts = baseTributavel * (config.aliquota_fgts / 100);
    const custoTotal = totalProventos + fgts + (baseTributavel * (config.aliquota_patronal/100));

    folhasCalculadas.push({
      funcionario_id: func.id,
      competencia,
      salario_base: salarioBase,
      total_proventos: totalProventos,
      total_descontos: totalDescontos,
      liquido_receber: totalProventos - totalDescontos,
      custo_total_empresa: custoTotal,
      status: 'Calculada'
    });
  }

  // 5. Salva (Upsert em Massa)
  const { data: folhasSalvas, error: errFolha } = await supabase
    .from('folha_pagamento')
    .upsert(folhasCalculadas, { onConflict: 'funcionario_id, competencia' })
    .select();

  if (errFolha) throw errFolha;

  // 6. Salva Itens (Relaciona com IDs gerados)
  // Primeiro limpa itens antigos dessa competência (via subquery ou delete por folha_id)
  // Simplificação: deleta itens das folhas que acabamos de salvar
  const idsFolhas = folhasSalvas.map(f => f.id);
  await supabase.from('folha_itens').delete().in('folha_id', idsFolhas);

  const itensFinais = [];
  folhasSalvas.forEach(f => {
    const itensFunc = itensParaSalvar.filter(i => i.tempId === f.funcionario_id);
    itensFunc.forEach(i => {
      itensFinais.push({
        folha_id: f.id,
        descricao: i.descricao,
        tipo: i.tipo,
        valor: i.valor,
        referencia: i.referencia
      });
    });
  });

  await supabase.from('folha_itens').insert(itensFinais);

  return folhasSalvas.length;
};

// Busca folha consolidada
export const getFolhaPagamento = async (funcionarioId, mes, ano) => {
  const competencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const { data, error } = await supabase
    .from('folha_pagamento')
    .select(`*, folha_itens (*)`)
    .eq('funcionario_id', funcionarioId)
    .eq('competencia', competencia)
    .maybeSingle();
  if (error) throw error;
  return data;
};