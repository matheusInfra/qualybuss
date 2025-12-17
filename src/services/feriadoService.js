import axios from 'axios';

const BASE_URL = 'https://brasilapi.com.br/api/feriados/v1';
const CACHE = {}; 

export const getFeriadosNacionais = async (ano) => {
  const anoAtual = ano || new Date().getFullYear();

  // Cache Hit: Retorna instantaneamente
  if (CACHE[anoAtual]) {
    return CACHE[anoAtual];
  }

  try {
    // Timeout curto para não prender o navegador se a API estiver lenta
    const response = await axios.get(`${BASE_URL}/${anoAtual}`, { timeout: 5000 });
    
    const feriadosFormatados = response.data.map(f => {
      // Truque para garantir fuso horário correto (adiciona T12:00:00)
      const dataCorreta = new Date(f.date + 'T12:00:00'); 
      
      return {
        id: `feriado-${f.date}`,
        title: f.name,
        start: dataCorreta,
        end: dataCorreta,
        allDay: true,
        type: 'feriado', 
        resource: 'Feriado Nacional'
      };
    });

    CACHE[anoAtual] = feriadosFormatados;
    return feriadosFormatados;

  } catch (error) {
    console.warn("BrasilAPI indisponível ou lenta. Carregando sem feriados.", error);
    return []; // Retorna vazio para não quebrar a tela
  }
};