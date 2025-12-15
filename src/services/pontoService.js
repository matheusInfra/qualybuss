import { supabase } from './supabaseClient';
import { recalcularDiaManual } from '../utils/calculadoraPonto';

// ==============================================================================
// 1. GESTÃO DE JORNADAS
// ==============================================================================

export const getJornadas = async () => {
  const { data, error } = await supabase.from('jornadas').select('*');
  if (error) throw error;
  return data;
};

export const createJornada = async (dados) => {
  const { data, error } = await supabase.from('jornadas').insert([dados]).select();
  if (error) throw error;
  return data[0];
};

export const vincularJornada = async (funcionarioId, jornadaId) => {
  const { error } = await supabase
    .from('funcionarios')
    .update({ jornada_id: jornadaId })
    .eq('id', funcionarioId);
  if (error) throw error;
};

// ==============================================================================
// 2. IMPORTAÇÃO (ARQUIVO AFD)
// ==============================================================================

export const salvarImportacaoPonto = async (meta, batidas, resumoDiario) => {
  // 1. Salva cabeçalho
  const { data: importacao, error: errImp } = await supabase
    .from('ponto_importacoes')
    .insert([meta])
    .select()
    .single();

  if (errImp) throw new Error("Erro ao criar importação: " + errImp.message);

  // 2. Salva Batidas Cruas (Em lotes para segurança)
  if (batidas && batidas.length > 0) {
    const batidasFormatadas = batidas.map(b => ({
      importacao_id: importacao.id,
      funcionario_id: b.funcionario_id,
      pis: b.pis,
      data_hora: b.data_hora,
      nsr: b.nsr,
      tipo_registro: '3'
    }));

    const CHUNK_SIZE = 500;
    for (let i = 0; i < batidasFormatadas.length; i += CHUNK_SIZE) {
      const chunk = batidasFormatadas.slice(i, i + CHUNK_SIZE);
      const { error: errBat } = await supabase.from('ponto_batidas').insert(chunk);
      if (errBat) {
        await supabase.from('ponto_importacoes').delete().eq('id', importacao.id);
        throw new Error("Erro ao salvar batidas: " + errBat.message);
      }
    }
  }

  // 3. Salva o Espelho (Resumo Diário)
  if (resumoDiario && resumoDiario.length > 0) {
    // Importante: Upsert para não duplicar dias se reimportar
    const { error: errRes } = await supabase.from('ponto_resumo_diario').upsert(resumoDiario, { onConflict: 'funcionario_id, data' });
    if (errRes) console.error("Erro ao salvar resumo:", errRes);
  }

  return importacao;
};

// ==============================================================================
// 3. TRATAMENTO E ESPELHO
// ==============================================================================

export const getEspelhoPonto = async (funcionarioId, mes, ano) => {
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  let query = supabase
    .from('ponto_resumo_diario')
    .select('*, funcionarios(nome_completo, cargo, jornada_id)')
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true });

  if (funcionarioId) {
    query = query.eq('funcionario_id', funcionarioId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Atualização Manual de Dia (Com Verificação de Bloqueio)
export const updatePontoDia = async (resumoId, dadosInputs, jornadaFuncionario) => {
  // 1. Verifica se o dia está bloqueado (Mês fechado)
  const { data: diaAtual } = await supabase.from('ponto_resumo_diario').select('bloqueado').eq('id', resumoId).single();
  
  if (diaAtual?.bloqueado) {
    throw new Error("Este dia pertence a uma competência fechada. Reabra o mês para editar.");
  }

  // 2. Prepara atualização
  let payload = { ...dadosInputs };

  if (jornadaFuncionario) {
    const calculo = recalcularDiaManual(dadosInputs, jornadaFuncionario);
    payload = {
      ...payload,
      horas_trabalhadas: calculo.trabalhado,
      saldo_minutos: calculo.saldo,
      status: dadosInputs.status || calculo.status
    };
  }

  const { data, error } = await supabase
    .from('ponto_resumo_diario')
    .update(payload)
    .eq('id', resumoId)
    .select();

  if (error) throw error;
  return data[0];
};

// ==============================================================================
// 4. FECHAMENTO E INTEGRAÇÃO (HANDOFF PARA SALÁRIO)
// ==============================================================================

export const fecharCompetenciaPonto = async (funcionarioId, competencia) => {
  const [ano, mes] = competencia.split('-');
  const inicio = `${competencia}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  // 1. Busca dias para apuração
  const { data: dias } = await supabase
    .from('ponto_resumo_diario')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim);

  if (!dias || dias.length === 0) throw new Error("Sem dados para fechar.");

  // 2. Apuração Quantitativa
  let horasExtras50 = 0;
  let atrasosMinutos = 0;
  let faltasDias = 0;

  dias.forEach(d => {
    if (d.status === 'Falta') faltasDias++;
    
    // Soma saldo em minutos
    if (d.saldo_minutos > 0) horasExtras50 += d.saldo_minutos;
    if (d.saldo_minutos < 0) atrasosMinutos += Math.abs(d.saldo_minutos);
  });

  // Converte para horas decimais
  const qtdHorasExtras50 = horasExtras50 / 60;

  // 3. Salva na Tabela de Medição Mensal
  const payloadMedicao = {
    funcionario_id: funcionarioId,
    competencia,
    qtd_horas_extras_50: qtdHorasExtras50,
    qtd_atrasos_minutos: atrasosMinutos,
    qtd_faltas_dias: faltasDias,
    status: 'Fechado',
    created_at: new Date()
  };

  const { error: errMed } = await supabase
    .from('medicao_mensal') // Nova tabela de integração
    .upsert(payloadMedicao, { onConflict: 'funcionario_id, competencia' });

  if (errMed) throw new Error("Erro ao salvar medição: " + errMed.message);

  // 4. Bloqueia os dias (Trava de Segurança)
  await supabase
    .from('ponto_resumo_diario')
    .update({ bloqueado: true })
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim);

  return payloadMedicao;
};

// Reabrir Mês (Desfaz Fechamento)
export const reabrirCompetenciaPonto = async (funcionarioId, competencia) => {
  const [ano, mes] = competencia.split('-');
  const inicio = `${competencia}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  // 1. Remove medição
  const { error: errDel } = await supabase
    .from('medicao_mensal')
    .delete()
    .eq('funcionario_id', funcionarioId)
    .eq('competencia', competencia);

  if (errDel) throw new Error("Erro ao reabrir: " + errDel.message);

  // 2. Desbloqueia dias
  await supabase
    .from('ponto_resumo_diario')
    .update({ bloqueado: false })
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim);

  return true;
};