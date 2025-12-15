import { supabase } from './supabaseClient';
import { 
  calcularINSS, 
  calcularMelhorIRRF, 
  calcularHoraExtra, 
  calcularDSR, 
  calcularDescontoFaltas 
} from '../utils/calculadoraSalario';

// Busca Configurações
export const getConfigFolha = async () => {
  const { data, error } = await supabase.from('config_folha').select('*').eq('ativo', true).single();
  if (error) throw new Error("Erro ao carregar taxas. Configure o sistema.");
  return data;
};

export const saveConfigFolha = async (novasConfig) => {
  const { data, error } = await supabase.from('config_folha').update(novasConfig).eq('ativo', true).select();
  if (error) throw error;
  return data;
};

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

// [INTEGRAÇÃO] Busca dados fechados do ponto
const getIntegracaoPonto = async (funcionarioId, competencia) => {
  const { data } = await supabase
    .from('integracao_ponto_folha')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .eq('competencia', competencia)
    .maybeSingle();
  return data;
};

/**
 * CÁLCULO INTELIGENTE DA FOLHA
 * Integra: Cadastro + Configurações + Ponto Eletrônico
 */
export const calcularESalvarFolha = async (funcionario, mes, ano) => {
  const competencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
  
  // 1. Carrega dependências
  const config = await getConfigFolha();
  const dadosPonto = await getIntegracaoPonto(funcionario.id, competencia); // <--- AQUI A MÁGICA
  
  const salarioBase = parseFloat(funcionario.salario_bruto || 0);
  const dependentes = funcionario.qtd_dependentes || 0;

  // 2. Calcula Variáveis (Vindas do Ponto)
  let totalProventos = salarioBase;
  let totalDescontos = 0;
  const itensFolha = []; // Array para guardar os eventos

  // Item 1: Salário Base
  itensFolha.push({ descricao: 'Salário Base', tipo: 'Provento', valor: salarioBase, referencia: 30 });

  // Item 2: Horas Extras (Se houver no ponto)
  let valorHE = 0;
  if (dadosPonto && dadosPonto.total_extras_50_minutos > 0) {
    valorHE = calcularHoraExtra(salarioBase, dadosPonto.total_extras_50_minutos, 50);
    const qtdHoras = (dadosPonto.total_extras_50_minutos / 60).toFixed(2);
    
    itensFolha.push({ descricao: 'Horas Extras 50%', tipo: 'Provento', valor: valorHE, referencia: qtdHoras });
    totalProventos += valorHE;

    // Reflexo DSR sobre HE
    const valorDSR = calcularDSR(valorHE); // Usando padrão 25/5 dias, ideal parametrizar
    itensFolha.push({ descricao: 'DSR s/ Horas Extras', tipo: 'Provento', valor: valorDSR, referencia: 0 });
    totalProventos += valorDSR;
  }

  // Item 3: Atrasos/Faltas (Se houver)
  let valorFaltas = 0;
  if (dadosPonto && (dadosPonto.total_atrasos_minutos > 0 || dadosPonto.total_faltas_dias > 0)) {
    // Converte dias de falta em minutos (apenas para unificar cálculo, ou trata separado)
    const minutosFaltas = (dadosPonto.total_faltas_dias * 440) + (dadosPonto.total_atrasos_minutos || 0); // 7h20m = 440min
    
    valorFaltas = calcularDescontoFaltas(salarioBase, minutosFaltas);
    const qtdHorasFalta = (minutosFaltas / 60).toFixed(2);

    itensFolha.push({ descricao: 'Faltas / Atrasos', tipo: 'Desconto', valor: valorFaltas, referencia: qtdHorasFalta });
    totalDescontos += valorFaltas;
  }

  // 3. Base de Cálculo de Impostos (Salário + Extras + DSR - Faltas)
  // Importante: INSS e IRRF incidem sobre o total bruto variável
  const baseTributavel = totalProventos - valorFaltas; // Faltas abatem a base

  // 4. Calcula Impostos (Sobre a nova base)
  const inss = calcularINSS(baseTributavel, config.tabela_inss);
  itensFolha.push({ descricao: 'INSS', tipo: 'Desconto', valor: inss, referencia: 0 });
  totalDescontos += inss;

  const irrfObj = calcularMelhorIRRF(baseTributavel, inss, dependentes, config);
  const irrf = irrfObj.valor;
  if (irrf > 0) {
    itensFolha.push({ descricao: 'IRRF', tipo: 'Desconto', valor: irrf, referencia: 0 });
    totalDescontos += irrf;
  }

  // 5. Custos Empresa
  const fgts = baseTributavel * (config.aliquota_fgts / 100);
  const patronal = baseTributavel * (config.aliquota_patronal / 100);
  const rat = baseTributavel * (config.aliquota_rat / 100);
  const custoTotal = baseTributavel + fgts + patronal + rat;

  const liquido = totalProventos - totalDescontos;

  // 6. Salva Cabeçalho
  const memoria = {
    tabela_inss_usada: config.tabela_inss,
    metodo_irrf: irrfObj.metodo,
    origem_dados: dadosPonto ? 'Integrado Ponto' : 'Manual/Contratual',
    aliquotas_empresa: { patronal: config.aliquota_patronal, rat: config.aliquota_rat, fgts: config.aliquota_fgts }
  };

  const folhaPayload = {
    funcionario_id: funcionario.id,
    competencia,
    salario_base: salarioBase,
    total_proventos: totalProventos,
    total_descontos: totalDescontos,
    liquido_receber: liquido,
    custo_total_empresa: custoTotal,
    memoria_calculo: memoria,
    status: 'Rascunho'
  };

  const { data: folha, error: errFolha } = await supabase
    .from('folha_pagamento')
    .upsert(folhaPayload, { onConflict: 'funcionario_id, competencia' })
    .select()
    .single();

  if (errFolha) throw errFolha;

  // 7. Salva Itens Detalhados
  await supabase.from('folha_itens').delete().eq('folha_id', folha.id);
  
  // Adiciona ID da folha em cada item
  const itensParaSalvar = itensFolha.map(i => ({ ...i, folha_id: folha.id }));
  await supabase.from('folha_itens').insert(itensParaSalvar);

  return folha;
};