// src/utils/calculadoraSalario.js

// Tabelas de Referência 2024/2025
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

/**
 * Calcula INSS Progressivo
 */
export const calcularINSS = (salarioBruto) => {
  let inss = 0;
  const baseTeto = Math.min(salarioBruto, 7786.02);
  
  for (const faixa of FAIXAS_INSS) {
    if (baseTeto <= faixa.limite) {
      inss = (baseTeto * faixa.aliq) - faixa.deducao;
      break;
    }
    if (faixa.limite === 7786.02) inss = 908.85; // Teto
  }
  return parseFloat(Math.max(0, inss).toFixed(2));
};

/**
 * Calcula IRRF
 */
export const calcularIRRF = (baseCalculo) => {
  let irrf = 0;
  for (const faixa of FAIXAS_IRRF) {
    if (baseCalculo <= faixa.limite) {
      irrf = (baseCalculo * faixa.aliq) - faixa.deducao;
      break;
    }
  }
  return parseFloat(Math.max(0, irrf).toFixed(2));
};

/**
 * Calcula Salário Líquido Individual
 */
export const calcularSalarioLiquido = (salarioBruto, dependentes = 0, outrosDescontos = 0) => {
  const bruto = Number(salarioBruto) || 0;
  const inss = calcularINSS(bruto);
  const deducaoDep = dependentes * 189.59;
  const baseIRRF = Math.max(0, bruto - inss - deducaoDep);
  const irrf = calcularIRRF(baseIRRF);
  
  const liquido = bruto - inss - irrf - Number(outrosDescontos);

  return {
    bruto,
    inss,
    irrf,
    liquido: parseFloat(liquido.toFixed(2)),
    totalDescontos: parseFloat((inss + irrf + Number(outrosDescontos)).toFixed(2))
  };
};

/**
 * [CORREÇÃO] Função que estava faltando e quebrava o módulo de folha
 * Processa uma lista de funcionários e gera o resumo da folha.
 */
export const calcularFolhaCompleta = (listaFuncionarios) => {
  if (!Array.isArray(listaFuncionarios)) return { resumo: {}, holerites: [] };

  const resumo = {
    totalBruto: 0,
    totalLiquido: 0,
    totalINSS: 0,
    totalIRRF: 0,
    totalFuncionarios: 0
  };

  const holerites = listaFuncionarios.map(func => {
    const salario = parseFloat(func.salario_bruto || 0);
    const dependentes = parseInt(func.qtd_dependentes || 0);
    
    const calculo = calcularSalarioLiquido(salario, dependentes);

    resumo.totalBruto += salario;
    resumo.totalLiquido += calculo.liquido;
    resumo.totalINSS += calculo.inss;
    resumo.totalIRRF += calculo.irrf;
    resumo.totalFuncionarios++;

    return {
      funcionario: func,
      ...calculo
    };
  });

  return { resumo, holerites };
};

// Export Default para compatibilidade
export default {
  calcularINSS,
  calcularIRRF,
  calcularSalarioLiquido,
  calcularFolhaCompleta
};