// src/utils/calculadoraSalario.js

// Tabelas INSS/IRRF 2024
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

export const calcularINSSProgressivo = (baseCalculo) => {
  let inss = 0;
  const baseTeto = Math.min(baseCalculo, 7786.02); // Teto 2024
  
  for (const faixa of FAIXAS_INSS) {
    if (baseTeto <= faixa.limite) {
      inss = (baseTeto * faixa.aliq) - faixa.deducao;
      break;
    }
    // Caso supere a penúltima faixa, aplica a última (teto)
    if (faixa.limite === 7786.02) inss = 908.85; 
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

// Função Principal Exportada
export const calcularSalarioLiquido = (salarioBruto, dependentes = 0, listaBeneficios = []) => {
  const bruto = Number(salarioBruto) || 0;
  const inss = calcularINSSProgressivo(bruto);
  const deducaoDep = dependentes * 189.59;
  const baseIRRF = Math.max(0, bruto - inss - deducaoDep);
  const irrf = calcularIRRF(baseIRRF);

  // Processar Benefícios Extras
  let proventosExtras = 0;
  let descontosExtras = 0;

  // Mapeia para calcular valores finais (caso seja %)
  const beneficiosProcessados = listaBeneficios.map(ben => {
    let valor = Number(ben.valor) || 0;
    if (ben.tipo_valor === 'Porcentagem') {
      valor = bruto * (valor / 100);
    }
    
    if (ben.tipo === 'Provento') proventosExtras += valor;
    if (ben.tipo === 'Desconto') descontosExtras += valor;

    return { ...ben, valorCalculado: valor };
  });

  const totalDescontos = inss + irrf + descontosExtras;
  const liquido = bruto + proventosExtras - totalDescontos;

  // Custo Empresa Simplificado
  const fgts = bruto * 0.08;
  const patronal = bruto * 0.20; // Estimativa
  const custoEmpresa = bruto + fgts + patronal + proventosExtras; // Empresa paga bruto + encargos + proventos extras

  return {
    salarioBruto: bruto,
    inss,
    irrf,
    totalProventosExtras: proventosExtras,
    totalDescontosExtras: descontosExtras,
    salarioLiquido: parseFloat(liquido.toFixed(2)),
    custoEmpresa: parseFloat(custoEmpresa.toFixed(2)),
    listaBeneficios: beneficiosProcessados,
    // Detalhes extras se precisar no futuro
    custosDetalhados: { fgts, patronal } 
  };
};

export default { calcularSalarioLiquido, calcularINSSProgressivo, calcularIRRF };