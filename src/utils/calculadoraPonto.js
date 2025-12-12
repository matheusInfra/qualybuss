// src/utils/calculadoraPonto.js
import { differenceInMinutes, parse, format } from 'date-fns';

/**
 * Converte string de hora "HH:mm" ou "HH:mm:ss" para minutos do dia (0 a 1440)
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Calcula o saldo do dia comparando Batidas Reais vs Jornada Prevista
 */
export const calcularSaldoDia = (batidasDoDia, jornada) => {
  // Se não tem jornada configurada, saldo é zero (ou tratar como erro)
  if (!jornada) return { saldo: 0, status: 'Sem Jornada' };

  // 1. Calcula horas trabalhadas (Pares de batidas)
  // Ex: Ent1-Sai1 + Ent2-Sai2
  let minutosTrabalhados = 0;
  const batidasOrdenadas = batidasDoDia.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora));

  for (let i = 0; i < batidasOrdenadas.length; i += 2) {
    const entrada = batidasOrdenadas[i];
    const saida = batidasOrdenadas[i + 1];

    if (entrada && saida) {
      const diff = differenceInMinutes(new Date(saida.data_hora), new Date(entrada.data_hora));
      minutosTrabalhados += diff;
    }
  }

  // 2. Calcula horas previstas da jornada
  // Ex: (12:00 - 08:00) + (18:00 - 13:00) = 4h + 5h = 9h = 540min
  let minutosPrevistos = 0;
  if (jornada.entrada_1 && jornada.saida_1) {
    minutosPrevistos += timeToMinutes(jornada.saida_1) - timeToMinutes(jornada.entrada_1);
  }
  if (jornada.entrada_2 && jornada.saida_2) {
    minutosPrevistos += timeToMinutes(jornada.saida_2) - timeToMinutes(jornada.entrada_2);
  }

  // 3. Aplica tolerância (Art 58 CLT - 10 min diários)
  const saldoReal = minutosTrabalhados - minutosPrevistos;
  let saldoConsiderado = saldoReal;

  if (Math.abs(saldoReal) <= (jornada.tolerancia_minutos || 10)) {
    saldoConsiderado = 0;
  }

  return {
    trabalhado: minutosTrabalhados,
    previsto: minutosPrevistos,
    saldo: saldoConsiderado,
    status: saldoConsiderado < 0 ? 'Atraso/Falta' : (saldoConsiderado > 0 ? 'Hora Extra' : 'Normal')
  };
};