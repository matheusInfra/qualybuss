// src/services/bancoService.js

let bancosCache = null;

export const getListaBancos = async () => {
  // Se já buscamos antes, retorna do cache para ser instantâneo
  if (bancosCache) return bancosCache;

  try {
    const response = await fetch('https://brasilapi.com.br/api/banks/v1');
    if (!response.ok) throw new Error('Falha ao buscar bancos');
    
    const data = await response.json();
    
    // Formata e ordena para facilitar o uso no select
    // Filtramos bancos sem código (null) que às vezes aparecem
    const bancosFormatados = data
      .filter(b => b.code) 
      .map(b => ({
        code: b.code,
        name: b.name,
        label: `${b.code} - ${b.name}`
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // Ordena A-Z

    bancosCache = bancosFormatados;
    return bancosFormatados;
  } catch (error) {
    console.error("Erro ao buscar bancos:", error);
    return []; // Retorna lista vazia para não quebrar o front
  }
};