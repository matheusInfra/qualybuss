import { supabase } from './supabaseClient';

export const getConfiguracaoIA = async () => {
  const { data, error } = await supabase
    .from('configuracoes_ia')
    .select('*')
    .limit(1)
    .single();
  
  if (error) throw error;
  return data;
};

export const updateConfiguracaoIA = async (id, dados) => {
  const { data, error } = await supabase
    .from('configuracoes_ia')
    .update({ ...dados, updated_at: new Date() })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};