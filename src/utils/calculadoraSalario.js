// src/utils/calculadoraSalario.js

// Tabela INSS 2024 (Progressiva)
const FAIXAS_INSS = [
  { limite: 1412.00, aliq: 0.075, deducao: 0 },
  { limite: 2666.68, aliq: 0.09, deducao: 21.18 },
  { limite: 4000.03, aliq: 0.12, deducao: 101.18 },
  { limite: 7786.02, aliq: 0.14, deducao: 181.18 }
];

// Tabela IRRF 2024
const FAIXAS_IRRF = [
  { limite: 2259.20, aliq: 0, deducao: 0 },
  { limite: 2826.65, aliq: 0.075, deducao: 169.44 },
  { limite: 3751.05, aliq: 0.15, deducao: 381.44 },
  { limite: 4664.68, aliq: 0.225, deducao: 662.77 },
  { limite: 9999999, aliq: 0.275, deducao: 896.00 }
];

export const calcularINSSProgressivo = (baseCalculo) => {
  let inss = 0;
  // Aplica teto
  const baseTeto = Math.min(baseCalculo, 7786.02);
  
  // Cálculo progressivo simplificado com dedução padrão
  for (const faixa of FAIXAS_INSS) {
    if (baseTeto <= faixa.limite) {
      inss = (baseTeto * faixa.aliq) - faixa.deducao;
      break;
    }
    // Se passar do teto, pega o valor máximo da última faixa
    if (faixa.limite === 7786.02) inss = 908.85; 
  }
  return Math.max(0, inss);
};

export const calcularFolhaCompleta = (funcionario, apontamentos, beneficiosFixos = []) => {
  const salarioBase = Number(funcionario.salario_bruto) || 0;
  const dependentes = Number(funcionario.qtd_dependentes) || 0;
  
  // 1. Apuração de Variáveis (Input do Mural)
  const qtdHe50 = Number(apontamentos.horas_extras_50) || 0;
  const qtdHe100 = Number(apontamentos.horas_extras_100) || 0;
  const faltasDias = Number(apontamentos.faltas_dias) || 0;
  const atrasosMin = Number(apontamentos.atrasos_minutos) || 0;
  const bonus = Number(apontamentos.bonus_comissao) || 0;
  
  // 2. Cálculos de Horas
  const valorHora = salarioBase / 220;
  const valorDia = salarioBase / 30;
  
  const totalHe50 = qtdHe50 * valorHora * 1.5; // ou 1.6 dependendo da CCT
  const totalHe100 = qtdHe100 * valorHora * 2.0;
  const totalFaltas = faltasDias * valorDia;
  const totalAtrasos = (atrasosMin / 60) * valorHora;
  
  // DSR sobre variáveis (Estimativa simplificada: 1/6 das variáveis se não informado)
  // Se o usuário digitou no mural, usa o dele. Se não, estima.
  const dsrVariaveis = apontamentos.valor_dsr > 0 
    ? Number(apontamentos.valor_dsr) 
    : (totalHe50 + totalHe100) / 6;

  // DSR Desconto (Sobre faltas integrais)
  const dsrDesconto = faltasDias > 0 ? valorDia : 0; 

  // 3. Benefícios Fixos (VR, VT...)
  let proventosBeneficios = 0;
  let descontosBeneficios = 0;
  beneficiosFixos.forEach(b => {
    if (b.tipo === 'Provento') proventosBeneficios += Number(b.valor);
    if (b.tipo === 'Desconto') descontosBeneficios += Number(b.valor);
  });

  // 4. Definição da Base de Cálculo Tributária
  // Base INSS = Salário + HE + DSR + Bônus - Faltas - Atrasos
  const baseINSS = (salarioBase + totalHe50 + totalHe100 + dsrVariaveis + bonus) - (totalFaltas + totalAtrasos + dsrDesconto);
  
  // 5. Cálculo Tributos Colaborador
  const valorINSS = calcularINSSProgressivo(baseINSS);
  
  const deducaoDep = dependentes * 189.59;
  const baseIRRF = baseINSS - valorINSS - deducaoDep;
  let valorIRRF = 0;
  for (const faixa of FAIXAS_IRRF) {
    if (baseIRRF <= faixa.limite) {
      valorIRRF = (baseIRRF * faixa.aliq) - faixa.deducao;
      break;
    }
  }
  valorIRRF = Math.max(0, valorIRRF);

  // 6. Totais Finais
  const totalProventos = salarioBase + totalHe50 + totalHe100 + dsrVariaveis + bonus + proventosBeneficios;
  const totalDescontos = totalFaltas + totalAtrasos + dsrDesconto + valorINSS + valorIRRF + descontosBeneficios + (Number(apontamentos.outros_descontos)||0);
  
  const liquido = totalProventos - totalDescontos;

  // 7. Custo Empresa (Shadow Payroll)
  // FGTS (8% sobre Base INSS + 13º/Férias proporcionais)
  const fgts = baseINSS * 0.08;
  const patronal = baseINSS * 0.20; // 20% INSS Empresa (se não for Simples)
  const rat_terceiros = baseINSS * 0.058; // Média 5.8%
  const provisionamento = baseINSS * 0.11; // ~1/12 Férias + 1/12 13º

  const custoTotal = baseINSS + fgts + patronal + rat_terceiros + provisionamento + proventosBeneficios;

  return {
    base: { salario: salarioBase, baseINSS, baseIRRF },
    proventos: { he50: totalHe50, he100: totalHe100, dsr: dsrVariaveis, bonus, beneficios: proventosBeneficios },
    descontos: { faltas: totalFaltas + totalAtrasos + dsrDesconto, inss: valorINSS, irrf: valorIRRF, beneficios: descontosBeneficios, outros: Number(apontamentos.outros_descontos) },
    totais: { bruto: totalProventos, descontos: totalDescontos, liquido, custoEmpresa: custoTotal }
  };
};