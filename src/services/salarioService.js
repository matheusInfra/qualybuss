import { supabase } from './supabaseClient';
import { 
  calcularINSS, 
  calcularMelhorIRRF, 
  calcularHoraExtra, 
  calcularDSR, 
  calcularDescontoFaltas 
} from '../utils/calculadoraSalario';

// --- CONFIGURAÇÕES ---
export const getConfigFolha = async () => {
  const { data, error } = await supabase.from('config_folha').select('*').eq('ativo', true).single();
  if (error) {
    // Retorna fallback se não tiver config (evita crash)
    return { 
      tabela_inss: [], 
      tabela_irrf: [], 
      aliquota_patronal: 20, 
      aliquota_rat: 2, 
      aliquota_fgts: 8 
    };
  }
  return data;
};

export const saveConfigFolha = async (novasConfig) => {
  const { data, error } = await supabase.from('config_folha').update(novasConfig).eq('ativo', true).select();
  if (error) throw error;
  return data;
};

// --- LEITURA DE FOLHA E PONTO ---
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

const getMedicaoPonto = async (funcionarioId, competencia) => {
  const { data } = await supabase
    .from('medicao_mensal')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .eq('competencia', competencia)
    .maybeSingle();
  return data;
};

// --- MOTOR DE CÁLCULO (PREVISÃO) ---
export const calcularPreviaFolha = async (funcionario, mes, ano) => {
  const competencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
  
  // 1. Busca Dados Necessários
  const config = await getConfigFolha(); 
  const medicao = await getMedicaoPonto(funcionario.id, competencia);
  
  const salarioBase = parseFloat(funcionario.salario_bruto || 0);
  const dependentes = funcionario.qtd_dependentes || 0;

  // 2. Calcula Proventos (Salário + Extras do Ponto)
  let totalProventos = salarioBase;
  const itens = [];
  
  itens.push({ descricao: 'Salário Base', tipo: 'Provento', valor: salarioBase, referencia: 30 });

  if (medicao) {
    // Horas Extras 50%
    if (medicao.qtd_horas_extras_50 > 0) {
      // Converte hora decimal para minutos para o calculo
      const minutosHE = medicao.qtd_horas_extras_50 * 60;
      const valorHE = calcularHoraExtra(salarioBase, minutosHE, 50);
      
      itens.push({ 
        descricao: 'Horas Extras 50%', 
        tipo: 'Provento', 
        valor: valorHE, 
        referencia: medicao.qtd_horas_extras_50.toFixed(2) + 'h' 
      });
      totalProventos += valorHE;

      // DSR sobre HE
      const valorDSR = calcularDSR(valorHE);
      itens.push({ descricao: 'DSR s/ Horas Extras', tipo: 'Provento', valor: valorDSR, referencia: 0 });
      totalProventos += valorDSR;
    }
  }

  // 3. Calcula Descontos (Faltas do Ponto)
  let totalDescontos = 0;
  let valorFaltas = 0;

  if (medicao && (medicao.qtd_faltas_dias > 0 || medicao.qtd_atrasos_minutos > 0)) {
    const minutosFaltas = (medicao.qtd_faltas_dias * 440) + (medicao.qtd_atrasos_minutos || 0);
    valorFaltas = calcularDescontoFaltas(salarioBase, minutosFaltas);
    
    itens.push({ descricao: 'Faltas / Atrasos', tipo: 'Desconto', valor: valorFaltas, referencia: `${medicao.qtd_faltas_dias}d` });
    totalDescontos += valorFaltas;
  }

  // 4. Calcula Impostos (INSS/IRRF) sobre Base Ajustada
  const baseTributavel = totalProventos - valorFaltas;
  
  const inss = calcularINSS(baseTributavel, config.tabela_inss);
  itens.push({ descricao: 'INSS', tipo: 'Desconto', valor: inss, referencia: 0 });
  totalDescontos += inss;

  const irrfObj = calcularMelhorIRRF(baseTributavel, inss, dependentes, config);
  if (irrfObj.valor > 0) {
    itens.push({ descricao: 'IRRF', tipo: 'Desconto', valor: irrfObj.valor, referencia: 0 });
    totalDescontos += irrfObj.valor;
  }

  const liquidoPrevisto = totalProventos - totalDescontos;

  // Custos Empresa
  const fgts = baseTributavel * (config.aliquota_fgts / 100);
  const patronal = baseTributavel * (config.aliquota_patronal / 100);
  const rat = baseTributavel * (config.aliquota_rat / 100);
  const custoTotal = totalProventos + fgts + patronal + rat; // (Proventos já incluem DSR/HE)

  // 5. Salva (Upsert)
  const memoria = {
    tabela_inss_usada: config.tabela_inss,
    metodo_irrf: irrfObj.metodo,
    base_irrf: irrfObj.base,
    origem_dados: medicao ? 'Integrado Ponto' : 'Manual',
    aliquotas_empresa: { patronal: config.aliquota_patronal, rat: config.aliquota_rat, fgts: config.aliquota_fgts }
  };

  const folhaPayload = {
    funcionario_id: funcionario.id,
    competencia,
    salario_base: salarioBase,
    total_proventos: totalProventos,
    total_descontos: totalDescontos,
    liquido_receber: liquidoPrevisto,
    custo_total_empresa: custoTotal,
    memoria_calculo: memoria,
    status: 'Previa'
  };

  const { data: folha, error: errFolha } = await supabase
    .from('folha_pagamento')
    .upsert(folhaPayload, { onConflict: 'funcionario_id, competencia' })
    .select()
    .single();

  if (errFolha) throw errFolha;

  // Salva Itens
  await supabase.from('folha_itens').delete().eq('folha_id', folha.id);
  const itensFinal = itens.map(i => ({ ...i, folha_id: folha.id }));
  await supabase.from('folha_itens').insert(itensFinal);

  return folha;
};

// --- CONFERÊNCIA (O TIRA-TEIMA) ---
export const salvarConferencia = async (folhaId, valorContabilidade) => {
  const { data: folha } = await supabase.from('folha_pagamento').select('liquido_receber').eq('id', folhaId).single();
  
  const diferenca = Math.abs(folha.liquido_receber - valorContabilidade);
  const status = diferenca < 0.05 ? 'Ok' : 'Divergente';

  const { error } = await supabase.from('folha_pagamento').update({
    valor_contabilidade_liquido: valorContabilidade,
    diferenca_identificada: diferenca,
    status_conferencia: status
  }).eq('id', folhaId);

  if (error) throw error;
  return status;
};