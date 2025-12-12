export const calcularINSS = (bruto) => {
  // Tabela 2024/2025 (Exemplo simplificado)
  if (bruto <= 1412.00) return bruto * 0.075;
  if (bruto <= 2666.68) return (bruto * 0.09) - 21.18;
  if (bruto <= 4000.03) return (bruto * 0.12) - 101.18;
  if (bruto <= 7786.02) return (bruto * 0.14) - 181.18;
  return 7786.02 * 0.14 - 181.18; // Teto
};

// ... funções para IRRF, FGTS, Vale Transporte