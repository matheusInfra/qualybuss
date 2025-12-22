import { supabase } from './supabaseClient';

// --- CATÁLOGO CORPORATIVO (MODELOS) ---
export const getCatalogoBeneficios = async (empresaId) => {
  const { data, error } = await supabase
    .from('beneficios_catalogo')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data;
};

export const criarItemCatalogo = async (dados) => {
  const { data, error } = await supabase
    .from('beneficios_catalogo')
    .insert([dados])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- DISTRIBUIÇÃO EM MASSA ---
export const distribuirBeneficio = async (beneficioModelo, funcionariosIds) => {
  if (!funcionariosIds || funcionariosIds.length === 0) return;

  // Cria o vínculo individual para cada funcionário selecionado
  const inserts = funcionariosIds.map(funcId => ({
    funcionario_id: funcId,
    nome: beneficioModelo.nome,
    tipo: beneficioModelo.tipo,       // Provento ou Desconto
    tipo_valor: beneficioModelo.tipo_valor, // Fixo ou Porcentagem
    valor: beneficioModelo.valor_padrao,
    descricao: beneficioModelo.descricao || 'Atribuído via Catálogo',
    recorrente: true
  }));

  const { error } = await supabase.from('beneficios_colaborador').insert(inserts);
  if (error) throw error;
  return true;
};

// --- CRUD INDIVIDUAL (JÁ EXISTENTE) ---
export const getBeneficiosPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase.from('beneficios_colaborador').select('*').eq('funcionario_id', funcionarioId);
  if (error) throw error;
  return data;
};

export const getBeneficiosEmLote = async (listaIds) => {
  if (!listaIds?.length) return [];
  const { data, error } = await supabase.from('beneficios_colaborador').select('*').in('funcionario_id', listaIds);
  if (error) throw error;
  return data;
};

export const criarBeneficio = async (dados) => {
  const { data, error } = await supabase.from('beneficios_colaborador').insert([dados]).select().single();
  if (error) throw error;
  return data;
};

export const deletarBeneficio = async (id) => {
  const { error } = await supabase.from('beneficios_colaborador').delete().eq('id', id);
  if (error) throw error;
  return true;
};