export const calcularINSS = (salarioBruto) => {
  let inss = 0;
  if (salarioBruto <= 1412.00) {
    inss = salarioBruto * 0.075;
  } else if (salarioBruto <= 2666.68) {
    inss = (1412.00 * 0.075) + ((salarioBruto - 1412.00) * 0.09);
  } else if (salarioBruto <= 4000.03) {
    inss = (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((salarioBruto - 2666.68) * 0.12);
  } else if (salarioBruto <= 7786.02) {
    inss = (1412.00 * 0.075) + ((2666.68 - 1412.00) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((salarioBruto - 4000.03) * 0.14);
  } else {
    inss = 908.85; // Teto 2024
  }
  return inss;
};

export const calcularIRRF = (baseCalculo) => {
  let irrf = 0;
  if (baseCalculo <= 2259.20) {
    irrf = 0;
  } else if (baseCalculo <= 2826.65) {
    irrf = (baseCalculo * 0.075) - 169.44;
  } else if (baseCalculo <= 3751.05) {
    irrf = (baseCalculo * 0.15) - 381.44;
  } else if (baseCalculo <= 4664.68) {
    irrf = (baseCalculo * 0.225) - 662.77;
  } else {
    irrf = (baseCalculo * 0.275) - 896.00;
  }
  return Math.max(0, irrf);
};

export const calcularSalarioLiquido = (salarioBruto, dependentes = 0, outrosDescontos = 0) => {
  const inss = calcularINSS(salarioBruto);
  const deducaoDependentes = dependentes * 189.59;
  const baseIRRF = salarioBruto - inss - deducaoDependentes;
  const irrf = calcularIRRF(baseIRRF);
  
  const totalDescontos = inss + irrf + outrosDescontos;
  const salarioLiquido = salarioBruto - totalDescontos;

  // Cálculos Patronais (Estimativas para Simples/Lucro Presumido)
  const fgts = salarioBruto * 0.08;
  // Estimativa de custo total (Salário + FGTS + Férias + 13º + Encargos ~60-70% em regimes normais, aqui simplificado para visão gerencial)
  const custoEmpresa = salarioBruto + fgts; 

  return {
    salarioBruto,
    inss,
    irrf,
    outrosDescontos,
    totalDescontos,
    salarioLiquido,
    fgts,
    custoEmpresa, // Custo direto mensal (Sem provisionamento anual completo para não poluir, mas pode ajustar)
    aliquotaEfetiva: ((totalDescontos / salarioBruto) * 100).toFixed(1)
  };
};