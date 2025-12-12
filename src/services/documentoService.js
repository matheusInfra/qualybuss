import { supabase } from './supabaseClient';

const BUCKET_NAME = 'documentos_pessoais';

/**
 * 1. FAZ O UPLOAD DO ARQUIVO
 * Envia o arquivo físico para o Supabase Storage
 */
export const uploadDocumento = async (file, funcionarioId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  // Salva dentro de uma pasta com o ID do funcionário
  const filePath = `${funcionarioId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (error) {
    console.error("Erro no upload do documento:", error.message);
    throw error;
  }
  return filePath;
};

/**
 * 2. SALVA O REGISTRO DO DOCUMENTO
 * Salva as informações (categoria, nome, etc.) na tabela 'documentos'
 */
export const createDocumentoRegistro = async (dadosDocumento) => {
  const { data, error } = await supabase
    .from('documentos')
    .insert([dadosDocumento])
    .select();
  
  if (error) {
    console.error("Erro ao salvar registro do documento:", error.message);
    throw error;
  }
  return data[0];
};

/**
 * 3. BUSCA OS DOCUMENTOS DE UM FUNCIONÁRIO
 * Pega a lista de todos os documentos de um único funcionário
 */
export const getDocumentosPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*') // Pega todas as colunas
    .eq('funcionario_id', funcionarioId) // Filtra pelo funcionário
    .order('created_at', { ascending: false }); // Mais novos primeiro

  if (error) {
    console.error("Erro ao buscar documentos:", error.message);
    throw error;
  }
  return data;
};

/**
 * 4. BAIXA O ARQUIVO FÍSICO (LINK)
 * Gera um link temporário e seguro para download (visualização/download direto)
 */
export const getDocumentoDownloadUrl = async (pathStorage) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(pathStorage, 60); // Link válido por 60 segundos

  if (error) {
    console.error("Erro ao gerar link de download:", error.message);
    throw error;
  }
  return data.signedUrl;
};

/**
 * [NOVO] 4.1 BAIXA O CONTEÚDO DO ARQUIVO (BLOB)
 * Baixa o binário do arquivo para ser usado na geração do ZIP.
 */
export const downloadArquivoParaBlob = async (pathStorage) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(pathStorage);

  if (error) {
    console.error("Erro ao baixar blob do arquivo:", error.message);
    throw error;
  }
  return data; // Retorna o objeto Blob
};

/**
 * 5. DELETA UM DOCUMENTO
 * Apaga o registro da tabela E o arquivo do Storage
 */
export const deleteDocumento = async (docId, pathStorage) => {
  // Passo 1: Deletar o arquivo do Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([pathStorage]);

  if (storageError) {
    console.error("Erro ao deletar arquivo do storage:", storageError.message);
    // Continua para tentar deletar o registro do banco mesmo assim
  }

  // Passo 2: Deletar o registro da tabela 'documentos'
  const { error: dbError } = await supabase
    .from('documentos')
    .delete()
    .eq('id', docId);

  if (dbError) {
    console.error("Erro ao deletar registro do banco:", dbError.message);
    throw dbError;
  }

  return true;
};