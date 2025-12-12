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

export const getEspelhoPonto = async (mes, ano) => {
  // Retorna os dados calculados para exibir na tela
  // (Simplificado para o exemplo, idealmente filtra por mês)
  const { data, error } = await supabase
    .from('ponto_resumo_diario')
    .select('*, funcionarios(nome_completo)')
    .order('data', { ascending: false });
  return data;
};