import { supabase } from './supabaseClient';

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

// --- VÍNCULO FUNCIONÁRIO <-> JORNADA ---
export const vincularJornada = async (funcionarioId, jornadaId) => {
  const { error } = await supabase
    .from('funcionarios')
    .update({ jornada_id: jornadaId })
    .eq('id', funcionarioId);
  if (error) throw error;
};

// --- IMPORTAÇÃO E CÁLCULO ---
export const salvarImportacaoPonto = async (meta, batidas, resumoDiario) => {
  // 1. Salva cabeçalho
  const { data: importacao, error: errImp } = await supabase
    .from('ponto_importacoes')
    .insert([meta])
    .select()
    .single();
  if (errImp) throw new Error("Erro ao criar importação: " + errImp.message);

  // 2. Salva Batidas Cruas (Raw)
  const batidasFormatadas = batidas.map(b => ({
    importacao_id: importacao.id,
    funcionario_id: b.funcionario_id,
    pis: b.pis,
    data_hora: b.data_hora,
    nsr: b.nsr,
    tipo_registro: '3'
  }));

  const { error: errBat } = await supabase.from('ponto_batidas').insert(batidasFormatadas);
  if (errBat) throw new Error("Erro ao salvar batidas: " + errBat.message);

  // 3. Salva o Espelho Calculado (Resumo Diário)
  if (resumoDiario && resumoDiario.length > 0) {
    const { error: errRes } = await supabase.from('ponto_resumo_diario').insert(resumoDiario);
    if (errRes) console.error("Erro ao salvar resumo (mas batidas foram salvas):", errRes);
  }

  return importacao;
};

// --- TRATAMENTO E ESPELHO (FUNÇÕES FALTANTES) ---

/**
 * Busca o espelho de ponto filtrando por mês e opcionalmente por funcionário.
 */
export const getEspelhoPonto = async (funcionarioId, mes, ano) => {
  // Define o intervalo do mês (Primeiro ao Último dia)
  const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
  // Truque para pegar o último dia do mês: dia 0 do mês seguinte
  const fim = new Date(ano, mes, 0).toISOString().split('T')[0];

  let query = supabase
    .from('ponto_resumo_diario')
    .select('*, funcionarios(nome_completo, cargo)')
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true });

  // Se um funcionário específico for passado, filtra por ele
  if (funcionarioId) {
    query = query.eq('funcionario_id', funcionarioId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

/**
 * Atualiza um dia específico no espelho (Tratamento manual: ajuste de horários, abono, etc.)
 */
export const updatePontoDia = async (resumoId, dadosAtualizados) => {
  const { data, error } = await supabase
    .from('ponto_resumo_diario')
    .update(dadosAtualizados)
    .eq('id', resumoId)
    .select();

  if (error) throw error;
  return data[0];
};