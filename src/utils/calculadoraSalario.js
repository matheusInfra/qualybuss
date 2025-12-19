// src/utils/calculadoraSalario.js

// Tabelas Oficiais 2024
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
  const baseTeto = Math.min(baseCalculo, 7786.02);
  
  for (const faixa of FAIXAS_INSS) {
    if (baseTeto <= faixa.limite) {
      inss = (baseTeto * faixa.aliq) - faixa.deducao;
      break;
    }
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

// --- MOTOR DE CÁLCULO ATUALIZADO ---
export const calcularFolhaCompleta = (funcionario, apontamentos, beneficiosFixos = []) => {
  const salarioBase = Number(funcionario.salario_bruto) || 0;
  const dependentes = Number(funcionario.qtd_dependentes) || 0;
  
  // 1. Variáveis
  const qtdHe50 = Number(apontamentos?.horas_extras_50) || 0;
  const qtdHe100 = Number(apontamentos?.horas_extras_100) || 0;
  const faltasDias = Number(apontamentos?.faltas_dias) || 0;
  const atrasosMin = Number(apontamentos?.atrasos_minutos) || 0;
  const bonus = Number(apontamentos?.bonus_comissao) || 0;
  const outrosDesc = Number(apontamentos?.outros_descontos) || 0;
  
  const valorHora = salarioBase / 220;
  const valorDia = salarioBase / 30;
  
  const totalHe50 = qtdHe50 * valorHora * 1.5;
  const totalHe100 = qtdHe100 * valorHora * 2.0;
  const totalFaltas = faltasDias * valorDia;
  const totalAtrasos = (atrasosMin / 60) * valorHora;
  
  const dsrVariaveis = apontamentos?.valor_dsr > 0 ? Number(apontamentos.valor_dsr) : (totalHe50 + totalHe100) / 6;
  const dsrDesconto = faltasDias > 0 ? valorDia : 0;

  // 2. Benefícios (Lógica % ou R$)
  let proventosBeneficios = 0;
  let descontosBeneficios = 0;
  const beneficiosCalculados = beneficiosFixos.map(ben => {
    let valorFinal = Number(ben.valor);
    if (ben.tipo_valor === 'Porcentagem') {
      valorFinal = salarioBase * (valorFinal / 100);
    }
    if (ben.tipo === 'Provento') proventosBeneficios += valorFinal;
    if (ben.tipo === 'Desconto') descontosBeneficios += valorFinal;
    return { ...ben, valorCalculado: valorFinal };
  });

  // 3. Base de Cálculo e Impostos Colaborador
  const baseINSS = Math.max(0, (salarioBase + totalHe50 + totalHe100 + dsrVariaveis + bonus) - (totalFaltas + totalAtrasos + dsrDesconto));
  
  const valorINSS = calcularINSSProgressivo(baseINSS);
  const deducaoDep = dependentes * 189.59;
  const baseIRRF = Math.max(0, baseINSS - valorINSS - deducaoDep);
  const valorIRRF = calcularIRRF(baseIRRF);

  const totalProventos = salarioBase + totalHe50 + totalHe100 + dsrVariaveis + bonus + proventosBeneficios;
  const totalDescontos = totalFaltas + totalAtrasos + dsrDesconto + valorINSS + valorIRRF + descontosBeneficios + outrosDesc;
  const liquido = Math.max(0, totalProventos - totalDescontos);

  // 4. Custo Empresa (Detalhamento Completo)
  const fgts = baseINSS * 0.08;
  const patronal = baseINSS * 0.20; // INSS Patronal (20%)
  const rat_terceiros = baseINSS * 0.058; // Sistema S + RAT (Médio)
  const provisionamento = baseINSS * 0.1111; // 1/12 Férias + 1/3 Férias + 1/12 13º (~11.11%)

  const custoTotal = baseINSS + fgts + patronal + rat_terceiros + provisionamento + proventosBeneficios;

  return {
    base: { salario: salarioBase, baseINSS, baseIRRF },
    proventos: { he50: totalHe50, he100: totalHe100, dsr: dsrVariaveis, bonus, beneficios: proventosBeneficios },
    descontos: { faltas: totalFaltas + totalAtrasos + dsrDesconto, inss: valorINSS, irrf: valorIRRF, beneficios: descontosBeneficios, outros: outrosDesc },
    totais: { bruto: totalProventos, descontos: totalDescontos, liquido, custoEmpresa: custoTotal },
    // NOVO: Objeto detalhado para o card da empresa
    custosDetalhados: {
      fgts,
      patronal,
      rat_terceiros,
      provisionamento,
      beneficios: proventosBeneficios, // Empresa paga os proventos de benefício
      total: custoTotal
    },
    beneficiosDetalhados: beneficiosCalculados
  };
};

// Wrapper Legado (Atualizado para passar o detalhamento)
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
    custosDetalhados: resultado.custosDetalhados, // Passando o detalhe adiante
    listaBeneficios: resultado.beneficiosDetalhados
  };
};