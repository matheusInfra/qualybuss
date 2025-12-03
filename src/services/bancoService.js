// src/services/bancoService.js

export const getBancos = async () => {
  try {
    // Usa a BrasilAPI (pública e gratuita)
    const response = await fetch('https://brasilapi.com.br/api/banks/v1');
    if (!response.ok) throw new Error('Erro ao buscar bancos');
    
    const data = await response.json();
    
    // Filtra apenas bancos que têm código (ISPB) para evitar sujeira
    // e ordena por código
    return data
      .filter(b => b.code)
      .sort((a, b) => a.code - b.code);
      
  } catch (error) {
    console.error("Erro no serviço de bancos:", error);
    // Retorna lista básica de fallback caso a API falhe
    return [
      { code: 1, name: 'Banco do Brasil' },
      { code: 237, name: 'Bradesco' },
      { code: 341, name: 'Itaú' },
      { code: 104, name: 'Caixa Econômica' },
      { code: 33, name: 'Santander' },
      { code: 260, name: 'Nubank' },
      { code: 77, name: 'Inter' }
    ];
  }
};