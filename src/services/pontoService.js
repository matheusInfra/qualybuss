import { supabase } from './supabaseClient';
// Importação segura da calculadora
import { recalcularDiaManual } from '../utils/calculadoraPonto';

// ==============================================================================
// 1. GESTÃO DE JORNADAS E VÍNCULOS (FUNCIONALIDADES ORIGINAIS)
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
// 2. IMPORTAÇÃO DE ARQUIVO (AFD/REP)
// ==============================================================================

export const salvarImportacaoPonto = async (meta, batidas, resumoDiario) => {
  // 1. Salva cabeçalho da importação
  const { data: importacao, error: errImp } = await supabase
    .from('ponto_importacoes')
    .insert([meta])
    .select()
    .single();

  if (errImp) throw new Error("Erro ao criar registro de importação: " + errImp.message);

  // 2. Salva Batidas Cruas (Loteamento para performance)
  if (batidas && batidas.length > 0) {
    const batidasFormatadas = batidas.map(b => ({
      importacao_id: importacao.id,
      funcionario_id: b.funcionario_id,
      pis: b.pis,
      data_hora: b.data_hora,
      nsr: b.nsr,
      tipo_registro: '3'
    }));

    // Envia em lotes de 500 para evitar timeout ou erro de payload
    const CHUNK_SIZE = 500;
    for (let i = 0; i < batidasFormatadas.length; i += CHUNK_SIZE) {
      const chunk = batidasFormatadas.slice(i, i + CHUNK_SIZE);
      const { error: errBat } = await supabase.from('ponto_batidas').insert(chunk);
      
      if (errBat) {
        // Se falhar, tentamos limpar o cabeçalho para não ficar lixo
        await supabase.from('ponto_importacoes').delete().eq('id', importacao.id);
        throw new Error("Erro ao salvar lote de batidas: " + errBat.message);
      }
    }
  }

  // 3. Salva o Espelho Calculado (Resumo Diário)
  if (resumoDiario && resumoDiario.length > 0) {
    // Usamos Upsert para garantir que se reimportar o mesmo dia, ele atualize
    const { error: errRes } = await supabase
      .from('ponto_resumo_diario')
      .upsert(resumoDiario, { onConflict: 'funcionario_id, data' });
      
    if (errRes) console.error("Erro ao salvar resumo do espelho:", errRes);
  }

  return importacao;
};

// ==============================================================================
// 3. LEITURA E TRATAMENTO (A MESA DE OPERAÇÃO)
// ==============================================================================

export const getEspelhoPonto = async (funcionarioId, mes, ano) => {
  // Define intervalo do mês (01 a 30/31)
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

/**
 * Atualiza um dia específico (Correção Manual)
 * Inclui verificação de TRAVA (Bloqueio) se o mês já estiver fechado.
 */
export const updatePontoDia = async (resumoId, dadosInputs, jornadaFuncionario) => {
  // 1. Verifica segurança (Bloqueio)
  const { data: diaAtual } = await supabase
    .from('ponto_resumo_diario')
    .select('bloqueado')
    .eq('id', resumoId)
    .single();
  
  if (diaAtual?.bloqueado) {
    throw new Error("Competência fechada. Reabra o mês para permitir edições.");
  }

  // 2. Prepara dados e Recalcula Saldos
  let payload = { ...dadosInputs };

  if (jornadaFuncionario) {
    try {
      const calculo = recalcularDiaManual(dadosInputs, jornadaFuncionario);
      payload = {
        ...payload,
        horas_trabalhadas: calculo.trabalhado,
        saldo_minutos: calculo.saldo,
        status: dadosInputs.status || calculo.status // Respeita status manual se forçado
      };
    } catch (e) {
      console.warn("Falha ao recalcular dia, salvando dados manuais puros:", e);
    }
  }

  // 3. Persiste
  const { data, error } = await supabase
    .from('ponto_resumo_diario')
    .update(payload)
    .eq('id', resumoId)
    .select();

  if (error) throw error;
  return data[0];
};

// ==============================================================================
// 4. FECHAMENTO E INTEGRAÇÃO (CONEXÃO COM SALÁRIO)
// ==============================================================================

/**
 * Fecha o mês, calcula os totais e gera a medição para o Financeiro.
 * Trava os dias para edição.
 */
export const fecharMesPonto = async (funcionarioId, competencia) => {
  const [ano, mes] = competencia.split('-');
  const inicio = `${competencia}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  // 1. Busca os dias do período
  const { data: dias } = await supabase
    .from('ponto_resumo_diario')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim);

  if (!dias || dias.length === 0) throw new Error("Não há dados de ponto para fechar neste período.");

  // 2. Apuração dos Totais
  let horasExtras50 = 0;
  let atrasosMinutos = 0;
  let faltasDias = 0;

  dias.forEach(d => {
    if (d.status === 'Falta') faltasDias++;
    
    // Soma saldos (positivos = extra, negativos = atraso)
    if (d.saldo_minutos > 0) horasExtras50 += d.saldo_minutos;
    if (d.saldo_minutos < 0) atrasosMinutos += Math.abs(d.saldo_minutos);
  });

  // Converte minutos para horas decimais para facilitar o cálculo financeiro
  const qtdHorasExtras50 = horasExtras50 / 60;

  // 3. Salva a Medição na Tabela de Integração
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
    .from('medicao_mensal')
    .upsert(payloadMedicao, { onConflict: 'funcionario_id, competencia' });

  if (errMed) throw new Error("Erro ao gerar medição: " + errMed.message);

  // 4. Bloqueia os dias (Trava de Segurança)
  await supabase
    .from('ponto_resumo_diario')
    .update({ bloqueado: true })
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim);

  return payloadMedicao;
};

/**
 * Reabre o mês caso precise corrigir algo (Desfaz o fechamento).
 */
export const reabrirMesPonto = async (funcionarioId, competencia) => {
  const [ano, mes] = competencia.split('-');
  const inicio = `${competencia}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  // 1. Remove a medição gerada (pois não é mais válida)
  await supabase
    .from('medicao_mensal')
    .delete()
    .eq('funcionario_id', funcionarioId)
    .eq('competencia', competencia);

  // 2. Desbloqueia os dias
  await supabase
    .from('ponto_resumo_diario')
    .update({ bloqueado: false })
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim);
  
  return true;
};