// src/utils/calculadoraSalario.js

/**
 * Calcula INSS Progressivo (Mantido da versão anterior)
 */
export const calcularINSS = (bruto, tabelaINSS) => {
  if (!tabelaINSS || tabelaINSS.length === 0) return 0;
  // ... (lógica anterior mantida para brevidade, se necessário repito)
  // Vou focar nas novas funções de integração abaixo
  
  let faixaEncontrada = null;
  const tabelaOrdenada = [...tabelaINSS].sort((a, b) => a.limite - b.limite);

  for (const faixa of tabelaOrdenada) {
    if (bruto <= faixa.limite) {
      faixaEncontrada = faixa;
      break;
    }
  }
  if (!faixaEncontrada) faixaEncontrada = tabelaOrdenada[tabelaOrdenada.length - 1];

  const inssCalculado = (bruto * (faixaEncontrada.aliquota / 100)) - faixaEncontrada.deducao;
  
  // Teto máximo
  const tetoFaixa = tabelaOrdenada[tabelaOrdenada.length - 1];
  const tetoValor = (tetoFaixa.limite * (tetoFaixa.aliquota / 100)) - tetoFaixa.deducao;

  return Math.max(0, Math.min(inssCalculado, tetoValor));
};

export const calcularIRRF = (baseCalculo, tabelaIRRF) => {
  if (!tabelaIRRF || baseCalculo <= 0) return 0;
  const tabelaOrdenada = [...tabelaIRRF].sort((a, b) => a.limite - b.limite);
  
  for (const faixa of tabelaOrdenada) {
    if (baseCalculo <= faixa.limite) {
      return (baseCalculo * (faixa.aliquota / 100)) - faixa.deducao;
    }
  }
  return 0;
};

export const calcularMelhorIRRF = (bruto, inss, dependentes, config) => {
  const deducaoDep = config.deducao_por_dependente || 189.59;
  const deducaoSimplificada = 564.80; 

  const baseLegal = bruto - inss - (dependentes * deducaoDep);
  const irrfLegal = Math.max(0, calcularIRRF(baseLegal, config.tabela_irrf));

  const baseSimplificada = bruto - deducaoSimplificada;
  const irrfSimplificado = Math.max(0, calcularIRRF(baseSimplificada, config.tabela_irrf));

  const valorFinal = Math.min(irrfLegal, irrfSimplificado);

  return {
    valor: valorFinal,
    metodo: irrfSimplificado < irrfLegal ? 'Simplificado' : 'Legal',
    base: irrfSimplificado < irrfLegal ? baseSimplificada : baseLegal
  };
};

/**
 * [NOVO] Calcula Valor de Horas Extras
 * @param {number} salarioBase 
 * @param {number} minutosExtras - Total de minutos do banco
 * @param {number} percentual - 50, 100, etc.
 * @param {number} jornadaMensal - Padrão 220h
 */
export const calcularHoraExtra = (salarioBase, minutosExtras, percentual = 50, jornadaMensal = 220) => {
  if (!minutosExtras || minutosExtras <= 0) return 0;
  
  const valorHora = salarioBase / jornadaMensal;
  const valorHoraComAdicional = valorHora * (1 + (percentual / 100));
  const horasDecimais = minutosExtras / 60;
  
  return horasDecimais * valorHoraComAdicional;
};

/**
 * [NOVO] Calcula DSR sobre Horas Extras (Estimativa)
 * A fórmula exata exige dias úteis vs domingos/feriados do mês específico.
 * Aqui usamos uma média comercial de 1/6 (aprox 16.66%) se não informado os dias exatos.
 */
export const calcularDSR = (valorHorasExtras, diasUteis = 25, diasInuteis = 5) => {
  if (!valorHorasExtras) return 0;
  // Fórmula: (Valor HE / Dias Úteis) * Dias Descanso
  return (valorHorasExtras / diasUteis) * diasInuteis;
};

/**
 * [NOVO] Calcula Desconto de Atrasos/Faltas
 */
export const calcularDescontoFaltas = (salarioBase, minutosAtraso, jornadaMensal = 220) => {
  if (!minutosAtraso || minutosAtraso <= 0) return 0;
  const valorHora = salarioBase / jornadaMensal;
  return (minutosAtraso / 60) * valorHora;
};