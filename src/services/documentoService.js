import { supabase } from './supabaseClient';

const BUCKET_NAME = 'documentos_pessoais';

/**
 * Faz o upload físico do arquivo para o Supabase Storage.
 * Retorna o caminho relativo (path) do arquivo salvo.
 */
export const uploadDocumento = async (file, funcionarioId) => {
  try {
    // Sanitiza o nome para evitar erros de URL
    const fileExt = file.name.split('.').pop();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
    const uniqueName = `${Date.now()}_${cleanFileName}.${fileExt}`;
    
    const filePath = `${funcionarioId}/${uniqueName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    
    return filePath; 
  } catch (error) {
    console.error("Erro no upload do documento (Storage):", error.message);
    throw error;
  }
};

/**
 * Cria o registro na tabela 'documentos'.
 * CORREÇÃO: Aceita chaves variadas para compatibilidade com todos os módulos.
 */
export const createDocumentoRegistro = async (dadosDocumento) => {
  try {
    // RESOLUÇÃO DO ERRO: Verifica qual chave foi enviada (do Form ou do Importador)
    const nomeFinal = dadosDocumento.nome_arquivo || dadosDocumento.nome;
    const pathFinal = dadosDocumento.path_storage || dadosDocumento.arquivo_url;

    if (!nomeFinal || !pathFinal) {
      throw new Error("Dados obrigatórios (nome_arquivo ou path_storage) estão faltando.");
    }

    const payload = {
      funcionario_id: dadosDocumento.funcionario_id,
      
      // Mapeamento Flexível
      nome_arquivo: nomeFinal,
      path_storage: pathFinal,
      
      categoria: dadosDocumento.categoria,
      tipo_arquivo: dadosDocumento.tipo_arquivo,
      tamanho: dadosDocumento.tamanho,
      descricao: dadosDocumento.descricao || null,
      data_documento: dadosDocumento.data_documento || new Date(),
      
      // Redundância para garantir (caso banco tenha trigger/legado)
      arquivo_url: pathFinal, 
      nome: nomeFinal,
      
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
    console.error("Erro ao salvar registro do documento (Banco):", error.message);
    throw error;
  }
};

export const getDocumentosPorFuncionario = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getDocumentoDownloadUrl = async (pathStorage) => {
  if (!pathStorage) throw new Error("Caminho do arquivo inválido.");

  // Remove prefixos de URL se existirem, mantendo apenas o path relativo
  const cleanPath = pathStorage.replace(/.*\/documentos_pessoais\//, '');

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(cleanPath, 60);

  if (error) {
    console.error("Erro ao gerar link:", error.message);
    throw error;
  }
  return data.signedUrl;
};

export const downloadArquivoParaBlob = async (pathStorage) => {
  const cleanPath = pathStorage.replace(/.*\/documentos_pessoais\//, '');
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(cleanPath);
  if (error) throw error;
  return data;
};

export const deleteDocumento = async (docId, pathStorage) => {
  if (pathStorage) {
    const cleanPath = pathStorage.replace(/.*\/documentos_pessoais\//, '');
    await supabase.storage.from(BUCKET_NAME).remove([cleanPath]);
  }

  const { error } = await supabase.from('documentos').delete().eq('id', docId);
  if (error) throw error;
  return true;
};