import { supabase } from './supabaseClient';

// --- USUÁRIOS DO SISTEMA (Tabela usuarios_empresas) ---

/**
 * Busca todos os usuários vinculados a uma empresa (ou todos se for super-admin)
 */
export const getUsuariosSistema = async () => {
  // Fazemos um Join para pegar o email da tabela auth (via view ou função seria o ideal)
  // Como não temos acesso direto à tabela auth.users no client, 
  // vamos assumir que salvamos o email/nome na tabela 'usuarios_empresas' ou 'funcionarios'
  // Para este exemplo, vamos buscar da tabela de vínculo que criamos.
  
  const { data, error } = await supabase
    .from('usuarios_empresas')
    .select(`
      id,
      role,
      user_id,
      empresa_id,
      empresas ( nome_fantasia )
    `);
    
  // Nota: Em produção, você precisaria de uma Edge Function para listar os emails reais do Auth
  // ou duplicar o email na tabela usuarios_empresas. 
  
  if (error) throw error;
  return data;
};

/**
 * Cria um novo usuário.
 * ATENÇÃO: Criar usuário no Auth requer uma Edge Function ou estar deslogado.
 * Aqui simularemos a criação do vínculo.
 */
export const createUsuarioVinculo = async (dados) => {
  const { data, error } = await supabase
    .from('usuarios_empresas')
    .insert([dados])
    .select();
  if (error) throw error;
  return data[0];
};

export const deleteUsuarioVinculo = async (id) => {
  const { error } = await supabase
    .from('usuarios_empresas')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};