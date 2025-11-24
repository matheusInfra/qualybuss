import { supabase } from './supabaseClient';

// --- IA (Já existente) ---
export const getConfiguracaoIA = async () => {
  const { data, error } = await supabase.from('configuracoes_ia').select('*').limit(1).single();
  if (error) throw error;
  return data;
};

export const updateConfiguracaoIA = async (id, dados) => {
  const { data, error } = await supabase.from('configuracoes_ia').update(dados).eq('id', id).select();
  if (error) throw error;
  return data[0];
};

// --- SISTEMA GERAL (Notificações, etc) ---

/**
 * Busca uma configuração pela chave (ex: 'notificacoes')
 */
export const getSystemConfig = async (chave) => {
  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .select('conteudo')
    .eq('chave', chave)
    .single();

  if (error) {
    console.error(`Erro ao buscar config ${chave}:`, error.message);
    return null;
  }
  return data.conteudo;
};

/**
 * Salva/Atualiza uma configuração
 */
export const updateSystemConfig = async (chave, conteudo) => {
  // Usa upsert para criar ou atualizar
  const { data, error } = await supabase
    .from('configuracoes_sistema')
    .upsert({ chave, conteudo, updated_at: new Date() }, { onConflict: 'chave' })
    .select();

  if (error) throw error;
  return data[0];
};