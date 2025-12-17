import axios from 'axios';

const BASE_URL = 'https://brasilapi.com.br/api/feriados/v1';
const CACHE = {}; // Cache simples em memória para evitar chamadas repetidas

export const getFeriadosNacionais = async (ano) => {
  const anoAtual = ano || new Date().getFullYear();

  // 1. Verifica se já temos os dados desse ano em cache
  if (CACHE[anoAtual]) {
    return CACHE[anoAtual];
  }

  try {
    // 2. Chama a API Pública
    const response = await axios.get(`${BASE_URL}/${anoAtual}`);
    
    // 3. Formata os dados para o padrão do calendário
    const feriadosFormatados = response.data.map(f => {
      // Ajusta o fuso horário para evitar que o feriado caia no dia anterior
      const dataCorreta = new Date(f.date + 'T00:00:00'); 
      
      return {
        id: `feriado-${f.date}`,
        title: f.name,
        start: dataCorreta,
        end: dataCorreta,
        allDay: true,
        type: 'feriado', // Identificador importante para o CSS
        resource: 'Feriado Nacional'
      };
    });

    // 4. Salva no cache e retorna
    CACHE[anoAtual] = feriadosFormatados;
    return feriadosFormatados;

  } catch (error) {
    console.error("Erro ao buscar feriados:", error);
    // Fallback: Retorna array vazio para não quebrar o calendário
    return [];
  }
};