// src/services/feriadoService.js

// Lista de Fallback (Segurança caso a API falhe)
const FERIADOS_FIXOS = {
  '01-01': 'Confraternização Universal',
  '21-04': 'Tiradentes',
  '01-05': 'Dia do Trabalho',
  '07-09': 'Independência do Brasil',
  '12-10': 'Nossa Sr.a Aparecida',
  '02-11': 'Finados',
  '15-11': 'Proclamação da República',
  '25-12': 'Natal'
};

const CACHE = {};

export const getFeriadosAno = async (ano) => {
  if (CACHE[ano]) return CACHE[ano];

  try {
    // Tenta buscar da API primeiro
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
    
    if (!response.ok) throw new Error('API Offline');
    
    const data = await response.json();
    
    const feriadosMap = data.reduce((acc, feriado) => {
      acc[feriado.date] = feriado.name;
      return acc;
    }, {});

    CACHE[ano] = feriadosMap;
    return feriadosMap;

  } catch (error) {
    console.warn("API de feriados indisponível. Usando lista local.", error);
    
    // Fallback: Gera as datas baseadas no ano solicitado
    const feriadosLocal = {};
    Object.entries(FERIADOS_FIXOS).forEach(([diaMes, nome]) => {
      feriadosLocal[`${ano}-${diaMes}`] = nome;
    });

    return feriadosLocal;
  }
};