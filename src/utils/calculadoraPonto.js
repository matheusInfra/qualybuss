import { differenceInMinutes } from 'date-fns';

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (totalMinutes) => {
  if (totalMinutes === null || totalMinutes === undefined) return "00:00";
  const isNegative = totalMinutes < 0;
  const absMin = Math.abs(totalMinutes);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  return `${isNegative ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const calcularSaldoDia = (batidasDoDia, jornada) => {
  if (!jornada) return { trabalhado: 0, saldo: 0, status: 'Sem Jornada', batidasFormatadas: [] };

  const listaBatidas = Array.isArray(batidasDoDia) ? batidasDoDia : [];
  const horarios = listaBatidas.map(b => {
    if (b.data_hora && typeof b.data_hora === 'string') {
      return b.data_hora.split('T')[1].substring(0, 5);
    }
    return null;
  }).filter(h => h).sort();
  
  let minutosTrabalhados = 0;
  let batidasImpares = false;

  for (let i = 0; i < horarios.length; i += 2) {
    if (horarios[i+1]) {
      const ent = timeToMinutes(horarios[i]);
      const sai = timeToMinutes(horarios[i+1]);
      minutosTrabalhados += (sai - ent);
    } else {
      batidasImpares = true; 
    }
  }

  let minutosPrevistos = 0;
  if (jornada.entrada_1 && jornada.saida_1) minutosPrevistos += timeToMinutes(jornada.saida_1) - timeToMinutes(jornada.entrada_1);
  if (jornada.entrada_2 && jornada.saida_2) minutosPrevistos += timeToMinutes(jornada.saida_2) - timeToMinutes(jornada.entrada_2);

  let saldo = minutosTrabalhados - minutosPrevistos;
  const tolerancia = jornada.tolerancia_minutos || 10;
  if (Math.abs(saldo) <= tolerancia) saldo = 0;

  let status = 'Normal';
  if (batidasImpares) status = 'Incompleto';
  else if (minutosTrabalhados === 0 && minutosPrevistos > 0) status = 'Falta';
  else if (saldo > 0) status = 'Extra';
  else if (saldo < 0) status = 'Atraso';
  if (minutosTrabalhados === 0 && minutosPrevistos === 0) status = 'Folga';

  return { trabalhado: minutosTrabalhados, previsto: minutosPrevistos, saldo, status, batidasFormatadas: horarios };
};

// A FUNÇÃO QUE FALTAVA
export const recalcularDiaManual = (inputs, jornada) => {
  const batidasSimuladas = [];
  const base = "2023-01-01"; 
  if (inputs.entrada_1) batidasSimuladas.push({ data_hora: `${base}T${inputs.entrada_1}:00` });
  if (inputs.saida_1)   batidasSimuladas.push({ data_hora: `${base}T${inputs.saida_1}:00` });
  if (inputs.entrada_2) batidasSimuladas.push({ data_hora: `${base}T${inputs.entrada_2}:00` });
  if (inputs.saida_2)   batidasSimuladas.push({ data_hora: `${base}T${inputs.saida_2}:00` });
  return calcularSaldoDia(batidasSimuladas, jornada);
};