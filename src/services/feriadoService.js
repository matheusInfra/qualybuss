// src/services/feriadoService.js

const CACHE = {};

export const getFeriadosAno = async (ano) => {
  if (CACHE[ano]) return CACHE[ano];

  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    if (!response.ok) throw new Error('Falha ao buscar feriados');
    
    const data = await response.json();
    
    // Transforma em um mapa para busca rápida: { '2025-12-25': 'Natal' }
    const feriadosMap = data.reduce((acc, feriado) => {
      acc[feriado.date] = feriado.name;
      return acc;
    }, {});

    CACHE[ano] = feriadosMap;
    return feriadosMap;
  } catch (error) {
    console.error(error);
    return {}; // Retorna vazio se falhar (não quebra o app)
  }
};