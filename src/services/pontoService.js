import { supabase } from './supabaseClient';
import { recalcularDiaManual } from '../utils/calculadoraPonto';

// --- JORNADAS ---
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

// --- IMPORTAÇÃO ---
export const salvarImportacaoPonto = async (meta, batidas, resumoDiario) => {
  // 1. Salva cabeçalho
  const { data: importacao, error: errImp } = await supabase
    .from('ponto_importacoes')
    .insert([meta])
    .select()
    .single();

  if (errImp) throw new Error("Erro ao criar importação: " + errImp.message);

  // 2. Salva Batidas Cruas (em lotes para não falhar com arquivos grandes)
  if (batidas.length > 0) {
    const batidasFormatadas = batidas.map(b => ({
      importacao_id: importacao.id,
      funcionario_id: b.funcionario_id,
      pis: b.pis,
      data_hora: b.data_hora,
      nsr: b.nsr,
      tipo_registro: '3'
    }));

    // Envia em chunks de 100
    const CHUNK_SIZE = 100;
    for (let i = 0; i < batidasFormatadas.length; i += CHUNK_SIZE) {
      const chunk = batidasFormatadas.slice(i, i + CHUNK_SIZE);
      const { error: errBat } = await supabase.from('ponto_batidas').insert(chunk);
      if (errBat) {
        // Se falhar, tenta limpar a importação
        await supabase.from('ponto_importacoes').delete().eq('id', importacao.id);
        throw new Error("Erro ao salvar lote de batidas: " + errBat.message);
      }
    }
  }

  // 3. Salva o Espelho Calculado
  if (resumoDiario && resumoDiario.length > 0) {
    const { error: errRes } = await supabase.from('ponto_resumo_diario').insert(resumoDiario);
    if (errRes) console.error("Erro ao salvar resumo (mas batidas foram salvas):", errRes);
  }

  return importacao;
};

// --- TRATAMENTO E ESPELHO ---
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

// Edição Manual de um Dia
export const updatePontoDia = async (resumoId, dadosInputs, jornadaFuncionario) => {
  let payload = { ...dadosInputs };

  // Se tiver jornada, recalcula matematicamente
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

// Fechamento de Mês
export const fecharMesPonto = async (funcionarioId, competencia) => {
  const [ano, mes] = competencia.split('-');
  const inicio = `${competencia}-01`;
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  const { data: dias } = await supabase
    .from('ponto_resumo_diario')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim);

  if (!dias || dias.length === 0) throw new Error("Sem dados para fechar.");

  let extras = 0;
  let atrasos = 0;
  let faltas = 0;

  dias.forEach(d => {
    if (d.status === 'Falta' || d.status?.includes('Incompleto')) faltas++;
    if (d.saldo_minutos > 0) extras += d.saldo_minutos;
    if (d.saldo_minutos < 0) atrasos += Math.abs(d.saldo_minutos);
  });

  const payloadIntegra = {
    funcionario_id: funcionarioId,
    competencia: competencia,
    total_extras_50_minutos: extras,
    total_atrasos_minutos: atrasos,
    total_faltas_dias: faltas,
    status: 'Pronto_Para_Folha',
    updated_at: new Date()
  };

  const { error } = await supabase
    .from('integracao_ponto_folha')
    .upsert(payloadIntegra, { onConflict: 'funcionario_id, competencia' });

  if (error) throw error;
  return payloadIntegra;
};