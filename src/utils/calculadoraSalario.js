// src/utils/calculadoraSalario.js

// Tabelas Oficiais (Base 2024 - Progressiva)
const FAIXAS_INSS = [
  { limite: 1412.00, aliq: 0.075, deducao: 0 },
  { limite: 2666.68, aliq: 0.09, deducao: 21.18 },
  { limite: 4000.03, aliq: 0.12, deducao: 101.18 },
  { limite: 7786.02, aliq: 0.14, deducao: 181.18 }
];

const FAIXAS_IRRF = [
  { limite: 2259.20, aliq: 0, deducao: 0 },
  { limite: 2826.65, aliq: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliq: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliq: 0.225, deducao: 662.77 },
  { limite: 9999999, aliq: 0.275, deducao: 896.00 }
];

// Funções Auxiliares
export const calcularINSSProgressivo = (baseCalculo) => {
  let inss = 0;
  const baseTeto = Math.min(baseCalculo, 7786.02);
  
  for (const faixa of FAIXAS_INSS) {
    if (baseTeto <= faixa.limite) {
      inss = (baseTeto * faixa.aliq) - faixa.deducao;
      break;
    }
    if (faixa.limite === 7786.02) inss = 908.85; // Teto
  }
  return Math.max(0, inss);
};

export const calcularIRRF = (baseCalculo) => {
  let irrf = 0;
  for (const faixa of FAIXAS_IRRF) {
    if (baseCalculo <= faixa.limite) {
      irrf = (baseCalculo * faixa.aliq) - faixa.deducao;
      break;
    }
  }
  return Math.max(0, irrf);
};

// --- MOTOR PRINCIPAL ---
export const calcularFolhaCompleta = (funcionario, apontamentos, beneficiosFixos = []) => {
  const safeNum = (v) => Number(v) || 0;
  const salarioBase = safeNum(funcionario.salario_bruto);
  const dependentes = safeNum(funcionario.qtd_dependentes);
  
  // 1. Variáveis (Inputs do Mural)
  const qtdHe50 = safeNum(apontamentos?.horas_extras_50);
  const qtdHe100 = safeNum(apontamentos?.horas_extras_100);
  const faltasDias = safeNum(apontamentos?.faltas_dias);
  const atrasosMin = safeNum(apontamentos?.atrasos_minutos);
  const bonus = safeNum(apontamentos?.bonus_comissao);
  const outrosDesc = safeNum(apontamentos?.outros_descontos);
  
  // 2. Cálculos de Horas
  const valorHora = salarioBase / 220;
  const valorDia = salarioBase / 30;
  
  const totalHe50 = qtdHe50 * valorHora * 1.5;
  const totalHe100 = qtdHe100 * valorHora * 2.0;
  const totalFaltas = faltasDias * valorDia;
  const totalAtrasos = (atrasosMin / 60) * valorHora;
  
  // DSR (Estimativa ou Manual)
  const dsrVariaveis = safeNum(apontamentos?.valor_dsr) > 0 
    ? safeNum(apontamentos.valor_dsr) 
    : (totalHe50 + totalHe100) / 6;

  const dsrDesconto = faltasDias > 0 ? valorDia : 0; 

  // 3. Benefícios (Lógica % vs R$)
  let proventosBeneficios = 0;
  let descontosBeneficios = 0;
  
  // Cria lista detalhada com o valor final calculado
  const beneficiosCalculados = beneficiosFixos.map(ben => {
    let valorFinal = safeNum(ben.valor);
    
    // Se for porcentagem, calcula sobre o Salário Base
    if (ben.tipo_valor === 'Porcentagem') {
      valorFinal = salarioBase * (valorFinal / 100);
    }

    if (ben.tipo === 'Provento') proventosBeneficios += valorFinal;
    if (ben.tipo === 'Desconto') descontosBeneficios += valorFinal;

    return { ...ben, valorCalculado: valorFinal };
  });

  // 4. Base Tributária
  // Base INSS = Salário + HE + DSR + Bônus - Faltas
  const baseINSS = Math.max(0, (salarioBase + totalHe50 + totalHe100 + dsrVariaveis + bonus) - (totalFaltas + totalAtrasos + dsrDesconto));
  
  // 5. Impostos Colaborador
  const valorINSS = calcularINSSProgressivo(baseINSS);
  
  const deducaoDep = dependentes * 189.59;
  const baseIRRF = Math.max(0, baseINSS - valorINSS - deducaoDep);
  const valorIRRF = calcularIRRF(baseIRRF);

  // 6. Totais Finais (Líquido)
  const totalProventos = salarioBase + totalHe50 + totalHe100 + dsrVariaveis + bonus + proventosBeneficios;
  const totalDescontos = totalFaltas + totalAtrasos + dsrDesconto + valorINSS + valorIRRF + descontosBeneficios + outrosDesc;
  
  const liquido = Math.max(0, totalProventos - totalDescontos);

  // 7. Custo Empresa (Shadow Payroll - Detalhado)
  const fgts = baseINSS * 0.08;
  const patronal = baseINSS * 0.20; // 20% INSS Patronal
  const rat_terceiros = baseINSS * 0.058; // Sistema S + RAT (Médio)
  const provisionamento = baseINSS * 0.1111; // ~1/12 Férias + 1/3 + 1/12 13º

  const custoTotal = baseINSS + fgts + patronal + rat_terceiros + provisionamento + proventosBeneficios;

  return {
    base: { salario: salarioBase, baseINSS, baseIRRF },
    proventos: { he50: totalHe50, he100: totalHe100, dsr: dsrVariaveis, bonus, beneficios: proventosBeneficios },
    descontos: { faltas: totalFaltas + totalAtrasos + dsrDesconto, inss: valorINSS, irrf: valorIRRF, beneficios: descontosBeneficios, outros: outrosDesc },
    totais: { bruto: totalProventos, descontos: totalDescontos, liquido, custoEmpresa: custoTotal },
    
    // Objeto detalhado para o Card do Patrão
    custosDetalhados: {
      fgts,
      patronal,
      rat_terceiros,
      provisionamento,
      beneficios: proventosBeneficios, // Empresa paga os proventos extras
      total: custoTotal
    },
    
    // Lista com valores finais processados
    listaBeneficios: beneficiosCalculados 
  };
};

// Wrapper para compatibilidade (quando não há apontamentos variáveis)
export const calcularSalarioLiquido = (salarioBruto, dependentes = 0, listaBeneficios = []) => {
  const resultado = calcularFolhaCompleta(
    { salario_bruto: salarioBruto, qtd_dependentes: dependentes },
    {}, 
    listaBeneficios
  );
  
  return {
    salarioBruto,
    inss: resultado.descontos.inss,
    irrf: resultado.descontos.irrf,
    totalProventosExtras: resultado.proventos.beneficios,
    totalDescontosExtras: resultado.descontos.beneficios,
    totalDescontos: resultado.totais.descontos,
    salarioLiquido: resultado.totais.liquido,
    custoEmpresa: resultado.totais.custoEmpresa,
    custosDetalhados: resultado.custosDetalhados, // IMPORTANTE
    listaBeneficios: resultado.listaBeneficios    // IMPORTANTE
  };
};