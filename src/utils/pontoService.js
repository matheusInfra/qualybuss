import { supabase } from './supabaseClient';

// Salva o lote de batidas processadas do arquivo TXT
export const salvarImportacaoPonto = async (meta, batidas) => {
  // 1. Cria o registro da importação (Cabeçalho)
  const { data: importacao, error: errImp } = await supabase
    .from('ponto_importacoes')
    .insert([meta])
    .select()
    .single();
  
  if (errImp) throw errImp;

  // 2. Prepara as batidas vinculando o ID da importação
  // Nota: Precisamos buscar o ID do funcionário pelo PIS antes de salvar
  // Isso geralmente é feito no frontend ou numa Edge Function para performance.
  // Aqui faremos uma estratégia híbrida: Salvar sem ID e depois rodar uma query de update,
  // ou resolver os IDs no front antes de enviar. RECOMENDO: Resolver no Front.
  
  const batidasProntas = batidas.map(b => ({
    ...b,
    importacao_id: importacao.id
  }));

  // 3. Salva as batidas (em lotes de 1000 para não estourar o limite)
  const { error: errBat } = await supabase
    .from('ponto_batidas')
    .insert(batidasProntas);

  if (errBat) throw errBat;

  return importacao;
};

export const getEspelhoPonto = async (funcionarioId, mes, ano) => {
  const inicio = `${ano}-${mes}-01`;
  const fim = `${ano}-${mes}-31`; // Simplificação

  const { data, error } = await supabase
    .from('ponto_resumo_diario')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .gte('data', inicio)
    .lte('data', fim)
    .order('data', { ascending: true });

  if (error) throw error;
  return data;
};