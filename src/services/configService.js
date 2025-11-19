// src/services/configService.js
import { supabase } from './supabaseClient';

// Pega a configuração (assumindo que só existe uma linha com ID 1 ou a primeira)
export const getConfiguracaoIA = async () => {
  const { data, error } = await supabase
    .from('configuracoes_ia')
    .select('*')
    .limit(1)
    .single();

  if (error) throw error;
  return data;
};

// Atualiza a configuração
export const updateConfiguracaoIA = async (id, dados) => {
  const { data, error } = await supabase
    .from('configuracoes_ia')
    .update({ 
      ...dados, 
      updated_at: new Date() 
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};