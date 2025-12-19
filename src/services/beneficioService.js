import { supabase } from './supabaseClient';

// --- CATÁLOGO (MODELOS) ---
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
  const { data, error } = await supabase.from('beneficios_catalogo').insert([dados]).select().single();
  if (error) throw error;
  return data;
};

// --- DISTRIBUIÇÃO EM MASSA (A Lógica de Escala) ---
export const distribuirBeneficio = async (beneficioCatalogo, funcionariosIds) => {
  if (!funcionariosIds || funcionariosIds.length === 0) return;

  // Prepara o payload para cada funcionário selecionado
  const inserts = funcionariosIds.map(funcId => ({
    funcionario_id: funcId,
    nome: beneficioCatalogo.nome,
    tipo: beneficioCatalogo.tipo,
    tipo_valor: beneficioCatalogo.tipo_valor,
    valor: beneficioCatalogo.valor_padrao,
    descricao: beneficioCatalogo.descricao,
    recorrente: true
  }));

  const { error } = await supabase.from('beneficios_colaborador').insert(inserts);
  if (error) throw error;
  return true;
};

// --- VÍNCULOS INDIVIDUAIS (Mantido) ---
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

export const criarBeneficio = async (dados) => { /* Mantido igual anterior */
  const { data, error } = await supabase.from('beneficios_colaborador').insert([dados]).select().single();
  if (error) throw error;
  return data;
};

export const deletarBeneficio = async (id) => { /* Mantido igual anterior */
  const { error } = await supabase.from('beneficios_colaborador').delete().eq('id', id);
  if (error) throw error;
  return true;
};