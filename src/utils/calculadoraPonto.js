import { differenceInMinutes } from 'date-fns';

/**
 * Converte "HH:mm" para minutos totais (ex: "01:30" -> 90)
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Converte minutos para "HH:mm" (ex: 90 -> "01:30")
 * Útil para exibir saldos na tela
 */
export const minutesToTime = (totalMinutes) => {
  if (totalMinutes === null || totalMinutes === undefined) return "00:00";
  const isNegative = totalMinutes < 0;
  const absMin = Math.abs(totalMinutes);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  return `${isNegative ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * MOTOR DE CÁLCULO
 * Compara o realizado (batidas) com o previsto (jornada)
 */
export const calcularSaldoDia = (batidasDoDia, jornada) => {
  // 1. Cenário: Sem jornada configurada
  if (!jornada) {
    return { trabalhado: 0, saldo: 0, status: 'Sem Jornada', batidasFormatadas: [] };
  }

  // 2. Extrai horários das batidas (HH:mm)
  // Garante que seja array para evitar crash
  const listaBatidas = Array.isArray(batidasDoDia) ? batidasDoDia : [];
  
  const horarios = listaBatidas
    .map(b => {
      // Suporta objeto do banco { data_hora: ... } ou string direta
      if (b.data_hora && typeof b.data_hora === 'string') {
        // Tenta pegar hora do formato ISO "YYYY-MM-DDTHH:mm:ss..."
        return b.data_hora.split('T')[1]?.substring(0, 5) || null;
      }
      return null;
    })
    .filter(h => h !== null)
    .sort();
  
  let minutosTrabalhados = 0;
  let batidasImpares = false;

  // Calcula tempo trabalhado em pares (0-1, 2-3, etc)
  for (let i = 0; i < horarios.length; i += 2) {
    if (horarios[i+1]) {
      const ent = timeToMinutes(horarios[i]);
      const sai = timeToMinutes(horarios[i+1]);
      if (ent !== null && sai !== null) {
        minutosTrabalhados += (sai - ent);
      }
    } else {
      batidasImpares = true; // Falta a batida de saída
    }
  }

  // 3. Calcula tempo previsto (Carga Horária da Jornada)
  let minutosPrevistos = 0;
  if (jornada.entrada_1 && jornada.saida_1) {
    minutosPrevistos += (timeToMinutes(jornada.saida_1) || 0) - (timeToMinutes(jornada.entrada_1) || 0);
  }
  if (jornada.entrada_2 && jornada.saida_2) {
    minutosPrevistos += (timeToMinutes(jornada.saida_2) || 0) - (timeToMinutes(jornada.entrada_2) || 0);
  }

  // 4. Cálculo do Saldo Bruto
  let saldo = minutosTrabalhados - minutosPrevistos;

  // 5. Regra de Tolerância (CLT: +/- 10 minutos diários)
  const tolerancia = jornada.tolerancia_minutos || 10;
  if (Math.abs(saldo) <= tolerancia) {
    saldo = 0;
  }

  // 6. Definição de Status
  let status = 'Normal';
  if (batidasImpares) status = 'Incompleto';
  else if (minutosTrabalhados === 0 && minutosPrevistos > 0) status = 'Falta';
  else if (saldo > 0) status = 'Extra';
  else if (saldo < 0) status = 'Atraso';
  
  // Se era dia de folga (previsto 0) e não trabalhou, status é Folga
  if (minutosTrabalhados === 0 && minutosPrevistos === 0) status = 'Folga';

  return {
    trabalhado: minutosTrabalhados,
    previsto: minutosPrevistos,
    saldo,
    status,
    batidasFormatadas: horarios // Retorna array ['08:00', '12:00'] para exibir
  };
};

/**
 * [FUNÇÃO NOVA - NECESSÁRIA PARA O ERRO SUMIR]
 * Recalcula um dia editado manualmente na tela de Tratamento.
 * Recebe os inputs do modal (Ent1, Sai1, Ent2, Sai2) e gera o objeto de salvamento.
 */
export const recalcularDiaManual = (inputs, jornada) => {
  const batidasSimuladas = [];
  
  // Data base fictícia apenas para formatar o ISO string que o calculador espera
  const baseDate = "2023-01-01"; 

  if (inputs.entrada_1) batidasSimuladas.push({ data_hora: `${baseDate}T${inputs.entrada_1}:00` });
  if (inputs.saida_1)   batidasSimuladas.push({ data_hora: `${baseDate}T${inputs.saida_1}:00` });
  if (inputs.entrada_2) batidasSimuladas.push({ data_hora: `${baseDate}T${inputs.entrada_2}:00` });
  if (inputs.saida_2)   batidasSimuladas.push({ data_hora: `${baseDate}T${inputs.saida_2}:00` });

  return calcularSaldoDia(batidasSimuladas, jornada);
};