// src/utils/intelligenceRadar.js
import { differenceInDays, addMonths, isBefore, parseISO } from 'date-fns';

/**
 * Analisa a saúde das férias e ausências da empresa ou funcionário.
 * Retorna uma lista de alertas categorizados por severidade.
 */
export const runComplianceRadar = (funcionarios, periodosAquisitivos, historicoCreditos) => {
  const alertas = [];
  const hoje = new Date();

  // 1. MOTOR DE FÉRIAS VENCIDAS (Compliance CLT)
  // Regra: Férias devem ser gozadas até 1 ano e 11 meses após a admissão/início do período.
  periodosAquisitivos.forEach(periodo => {
    if (periodo.status !== 'Fechado' && periodo.limite_concessivo) {
      const limite = parseISO(periodo.limite_concessivo);
      const diasParaVencer = differenceInDays(limite, hoje);

      if (diasParaVencer < 0) {
        alertas.push({
          tipo: 'CRITICO',
          titulo: 'Férias Vencidas (Risco de Multa)',
          mensagem: `O colaborador ${periodo.funcionarios?.nome_completo || 'N/A'} estourou o limite concessivo em ${Math.abs(diasParaVencer)} dias. Ação imediata necessária.`,
          acao: 'Agendar Férias'
        });
      } else if (diasParaVencer <= 60) {
        alertas.push({
          tipo: 'ALERTA',
          titulo: 'Prazo Limite Aproximando',
          mensagem: `Férias de ${periodo.funcionarios?.nome_completo} vencem em ${diasParaVencer} dias.`,
          acao: 'Planejar'
        });
      }
    }
  });

  // 2. MOTOR DE BANCO DE HORAS (Financeiro)
  // Agrupa créditos por funcionário para ver quem está acumulando muito
  const saldoPorFuncionario = {};
  historicoCreditos.forEach(credito => {
    if (!saldoPorFuncionario[credito.funcionario_id]) {
      saldoPorFuncionario[credito.funcionario_id] = { nome: credito.funcionarios?.nome_completo, saldo: 0 };
    }
    // Simplificação: Assume que tudo em historico_creditos soma ao banco
    // Num cenário real, precisaria filtrar por tipo 'Banco de Horas'
    if(credito.tipo === 'Banco de Horas' || credito.tipo === 'Hora Extra') {
        saldoPorFuncionario[credito.funcionario_id].saldo += Number(credito.quantidade);
    }
  });

  Object.values(saldoPorFuncionario).forEach(f => {
    if (f.saldo > 40) { // Limite hipotético de 40h
      alertas.push({
        tipo: 'SUGESTAO',
        titulo: 'Banco de Horas Alto',
        mensagem: `${f.nome} tem ${f.saldo}h acumuladas. Sugira uma folga na próxima sexta-feira para reduzir o passivo.`,
        acao: 'Sugerir Folga'
      });
    }
  });

  // 3. MOTOR DE FRAGMENTAÇÃO (Bem-estar)
  // Detecta se alguém tirou muitas "férias picadas" (Ex: 5 dias, 5 dias, 5 dias)
  // (Lógica simplificada para exemplo)
  
  return alertas.sort((a, b) => {
    const peso = { 'CRITICO': 3, 'ALERTA': 2, 'SUGESTAO': 1 };
    return peso[b.tipo] - peso[a.tipo];
  });
};