export const calcularINSS = (salarioBruto) => {
  let inss = 0;
  if (salarioBruto <= 1412.00) inss = salarioBruto * 0.075;
  else if (salarioBruto <= 2666.68) inss = (1412 * 0.075) + ((salarioBruto - 1412) * 0.09);
  else if (salarioBruto <= 4000.03) inss = (1412 * 0.075) + ((2666.68 - 1412) * 0.09) + ((salarioBruto - 2666.68) * 0.12);
  else if (salarioBruto <= 7786.02) inss = (1412 * 0.075) + ((2666.68 - 1412) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((salarioBruto - 4000.03) * 0.14);
  else inss = 908.85;
  return inss;
};

export const calcularIRRF = (baseCalculo) => {
  let irrf = 0;
  if (baseCalculo <= 2259.20) irrf = 0;
  else if (baseCalculo <= 2826.65) irrf = (baseCalculo * 0.075) - 169.44;
  else if (baseCalculo <= 3751.05) irrf = (baseCalculo * 0.15) - 381.44;
  else if (baseCalculo <= 4664.68) irrf = (baseCalculo * 0.225) - 662.77;
  else irrf = (baseCalculo * 0.275) - 896.00;
  return Math.max(0, irrf);
};

// --- FUNÇÃO PRINCIPAL ATUALIZADA ---
export const calcularSalarioLiquido = (salarioBruto, dependentes = 0, listaBeneficios = []) => {
  const inss = calcularINSS(salarioBruto);
  const deducaoDependentes = dependentes * 189.59;
  const baseIRRF = Math.max(0, salarioBruto - inss - deducaoDependentes);
  const irrf = calcularIRRF(baseIRRF);

  // Processa Benefícios Extras
  let totalProventosExtras = 0; // Ex: Bônus, Ajuda de Custo
  let totalDescontosExtras = 0; // Ex: VR, VT, Farmácia

  listaBeneficios.forEach(item => {
    const valor = Number(item.valor) || 0;
    if (item.tipo === 'Provento') {
      totalProventosExtras += valor;
    } else if (item.tipo === 'Desconto') {
      totalDescontosExtras += valor;
    }
  });
  
  const totalDescontos = inss + irrf + totalDescontosExtras;
  const salarioLiquido = (salarioBruto + totalProventosExtras) - totalDescontos;

  // Custo Empresa (Estimado)
  // FGTS (8%) + Salário + Proventos Extras (Empresa paga)
  const fgts = (salarioBruto + totalProventosExtras) * 0.08; 
  const custoEmpresa = salarioBruto + totalProventosExtras + fgts; 

  return {
    salarioBruto,
    inss,
    irrf,
    totalProventosExtras,
    totalDescontosExtras,
    totalDescontos,
    salarioLiquido,
    fgts,
    custoEmpresa,
    listaBeneficios 
  };
};