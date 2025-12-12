import { supabase } from './supabaseClient';

// Busca a folha de um funcionário em um mês específico
export const getFolhaPagamento = async (funcionarioId, mes, ano) => {
  // Cria data base para filtro (primeiro dia do mês)
  const competencia = `${ano}-${String(mes).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('folha_pagamento')
    .select(`
      *,
      folha_itens (*)
    `)
    .eq('funcionario_id', funcionarioId)
    .eq('competencia', competencia)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// Simula e Salva a Folha (Cálculo Básico)
export const calcularESalvarFolha = async (funcionario, mes, ano, eventosExtras = []) => {
  const competencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const salarioBase = parseFloat(funcionario.salario_bruto || 0);

  // 1. Cálculos Básicos (Simplificado)
  const inss = salarioBase * 0.08; // Exemplo fixo (ideal é usar tabela progressiva)
  const irrf = 0; // Simplificação
  const liquido = salarioBase - inss - irrf;

  // 2. Prepara o objeto da folha
  const folhaPayload = {
    funcionario_id: funcionario.id,
    competencia,
    salario_base: salarioBase,
    total_proventos: salarioBase,
    total_descontos: inss,
    liquido_receber: liquido,
    custo_total_empresa: salarioBase * 1.28 // +20% Patronal + 8% FGTS
  };

  // 3. Salva/Atualiza Cabeçalho
  const { data: folha, error: errFolha } = await supabase
    .from('folha_pagamento')
    .upsert(folhaPayload, { onConflict: 'funcionario_id, competencia' })
    .select()
    .single();

  if (errFolha) throw errFolha;

  // 4. Salva Itens (Limpa anteriores primeiro se for recálculo)
  await supabase.from('folha_itens').delete().eq('folha_id', folha.id);

  const itens = [
    { folha_id: folha.id, descricao: 'Salário Base', tipo: 'Provento', valor: salarioBase, referencia: 30 },
    { folha_id: folha.id, descricao: 'INSS', tipo: 'Desconto', valor: inss, referencia: 8.0 }
  ];

  await supabase.from('folha_itens').insert(itens);

  return folha;
};