import { supabase } from './supabaseClient';

const BUCKET_NAME = 'documentos_pessoais';

/**
 * Faz o upload físico do arquivo para o Supabase Storage.
 * Retorna o caminho (path) do arquivo salvo.
 */
export const uploadDocumento = async (file, funcionarioId) => {
  try {
    const fileExt = file.name.split('.').pop();
    // Nome único para evitar sobrescrita
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${funcionarioId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (error) throw error;
    
    return filePath; // Retorna 'id_func/nome_arquivo.pdf'
  } catch (error) {
    console.error("Erro no upload do documento:", error.message);
    throw error;
  }
};

/**
 * Cria o registro na tabela 'documentos' do banco de dados.
 * Mapeia os campos do frontend para o schema exato da tabela.
 */
export const createDocumentoRegistro = async (dadosDocumento) => {
  try {
    // Payload mapeado conforme o schema "raio-x" do banco
    const payload = {
      funcionario_id: dadosDocumento.funcionario_id,
      
      // CAMPOS OBRIGATÓRIOS (NOT NULL)
      nome_arquivo: dadosDocumento.nome, // O front manda 'nome', o banco exige 'nome_arquivo'
      path_storage: dadosDocumento.arquivo_url, // O arquivo_url do front é o path_storage do banco
      
      // CAMPOS OPCIONAIS
      categoria: dadosDocumento.categoria,
      tipo_arquivo: dadosDocumento.tipo_arquivo,
      tamanho: dadosDocumento.tamanho,
      descricao: dadosDocumento.descricao || null,
      
      // Campos de redundância/compatibilidade (se existirem no banco, ok; se não, o banco ignora se não forem not null)
      arquivo_url: dadosDocumento.arquivo_url, 
      nome: dadosDocumento.nome,
      
      created_at: new Date()
    };

    const { data, error } = await supabase
      .from('documentos')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao salvar registro do documento:", error.message);
    throw error;
  }
};

/**
 * Busca todos os documentos de um funcionário específico.
 */
export const getDocumentosPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Gera uma URL assinada (temporária) para download ou visualização.
 */
export const getDocumentoDownloadUrl = async (pathStorage) => {
  if (!pathStorage) throw new Error("Caminho do arquivo não fornecido.");

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(pathStorage, 60); // Link válido por 60 segundos

  if (error) {
    console.error("Erro ao gerar link:", error.message);
    throw error;
  }
  return data.signedUrl;
};

/**
 * Baixa o arquivo como Blob (utilitário para gerar ZIPs ou downloads diretos).
 */
export const downloadArquivoParaBlob = async (pathStorage) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(pathStorage);

  if (error) throw error;
  return data;
};

/**
 * Deleta o documento do banco e remove o arquivo físico do storage.
 */
export const deleteDocumento = async (docId, pathStorage) => {
  // 1. Remove do Storage (se o caminho existir)
  if (pathStorage) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([pathStorage]);
      
    if (storageError) {
      console.warn("Aviso: Falha ao remover arquivo físico (pode já ter sido excluído):", storageError.message);
    }
  }

  // 2. Remove o registro do banco
  const { error } = await supabase
    .from('documentos')
    .delete()
    .eq('id', docId);

  if (error) throw error;
  return true;
};