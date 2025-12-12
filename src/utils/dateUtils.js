// src/utils/dateUtils.js

/**
 * Retorna o número de dias em um determinado mês/ano.
 */
export const getDaysInMonth = (ano, mes) => {
  // O 'dia 0' do próximo mês é o último dia do mês atual
  return new Date(ano, mes + 1, 0).getDate();
};

/**
 * Retorna o dia da semana em que o mês começa (0 = Dom, 1 = Seg, ...)
 */
export const getFirstDayOfMonth = (ano, mes) => {
  return new Date(ano, mes, 1).getDay();
};

/**
 * Retorna o nome do mês a partir de um objeto Date.
 */
export const getMonthName = (data) => {
  return data.toLocaleString('pt-BR', { month: 'long' });
};

/**
 * Gera a matriz 6x7 (42 dias) para o calendário.
 * @param {Date} data - O objeto Date do mês a ser exibido (ex: new Date('2025-11-01'))
 */
export const generateCalendarGrid = (data) => {
  const ano = data.getFullYear();
  const mes = data.getMonth(); // 0-11

  const daysInMonth = getDaysInMonth(ano, mes);
  const firstDay = getFirstDayOfMonth(ano, mes);

  const grid = [];
  
  // 1. Preenche os dias do mês anterior
  const prevMonth = new Date(ano, mes, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = 0; i < firstDay; i++) {
    grid.push({
      ano: prevMonth.getFullYear(),
      mes: prevMonth.getMonth(),
      dia: prevMonthDays - firstDay + 1 + i,
      tipo: 'prev',
    });
  }

  // 2. Preenche os dias do mês atual
  for (let i = 1; i <= daysInMonth; i++) {
    grid.push({
      ano: ano,
      mes: mes,
      dia: i,
      tipo: 'current',
    });
  }

  // 3. Preenche os dias do próximo mês (para completar 42 células)
  const nextMonth = new Date(ano, mes + 1, 1);
  const remainingDays = 42 - grid.length;
  for (let i = 1; i <= remainingDays; i++) {
    grid.push({
      ano: nextMonth.getFullYear(),
      mes: nextMonth.getMonth(),
      dia: i,
      tipo: 'next',
    });
  }
  
  return grid;
};