import { supabase } from './supabaseClient';

/**
 * SERVIÇO DE GESTÃO DE USUÁRIOS (VÍNCULOS)
 * * Este serviço gerencia a lista de colaboradores que têm acesso ao sistema.
 * Diferente dos funcionários (que são apenas registros de RH), os usuários aqui
 * possuem credenciais de login (email/senha) e permissões de acesso.
 */

/**
 * Busca todos os usuários vinculados a empresas (Lista de Colaboradores com Acesso)
 * Retorna também o nome da empresa vinculada para exibição na lista.
 */
export const getUsuariosSistema = async () => {
  const { data, error } = await supabase
    .from('usuarios_empresas')
    .select(`
      *,
      empresas (
        id,
        nome_fantasia
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar usuários do sistema:', error);
    throw error;
  }
  return data;
};

/**
 * CRIAÇÃO DE USUÁRIO (Login + Vínculo)
 * * Esta função NÃO insere diretamente no banco. Ela chama uma Edge Function ('invite-user')
 * que roda no servidor do Supabase com permissões de administrador.
 * * A Edge Function é responsável por:
 * 1. Criar o usuário no Supabase Auth (email/senha).
 * 2. Confirmar o email automaticamente.
 * 3. Criar o registro na tabela 'usuarios_empresas' vinculando à loja selecionada.
 * * @param {Object} dados - { nome, email, senha, empresa_id, role }
 */
export const createUsuarioVinculo = async (dados) => {
  // Validação básica antes de enviar
  if (!dados.email || !dados.senha || !dados.empresa_id) {
    throw new Error("Email, senha e empresa são obrigatórios.");
  }

  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: dados
  });

  if (error) {
    console.error('Erro de conexão com a Edge Function:', error);
    throw new Error('Falha ao conectar com o servidor de convites. Verifique se a função "invite-user" está ativa.');
  }

  // A função pode retornar 200 OK mas conter um erro lógico (ex: email duplicado) no corpo
  if (data && data.error) {
    throw new Error(data.error); 
  }

  return data;
};

/**
 * Remove o acesso de um usuário (Remove o vínculo com a empresa)
 * * Nota: Isso revoga o acesso à empresa imediatamente, mas o login do usuário
 * continua existindo no Auth (ele poderá ser vinculado a outra empresa no futuro).
 * Para deletar o login definitivamente, seria necessária outra função administrativa.
 */
export const deleteUsuarioVinculo = async (id) => {
  const { error } = await supabase
    .from('usuarios_empresas')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Erro ao remover usuário:', error);
    throw error;
  }
  return true;
};