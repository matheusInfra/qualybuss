import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { uploadDocumento, createDocumentoRegistro } from '../../services/documentoService';
import './Documentos.css';

const initialState = {
  nome_arquivo: '',
  categoria: '',
  data_documento: '',
};

function DocumentoUploadForm({ funcionarioId }) {
  const [formData, setFormData] = useState(initialState);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Precisamos do 'mutate' para este aprimoramento
  const { mutate } = useSWRConfig();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (formData.nome_arquivo === '') {
        setFormData(prev => ({ ...prev, nome_arquivo: selectedFile.name }));
      }
    } else {
      setFile(null);
    }
  };
  
  // Função para limpar o formulário
  const handleCancel = () => {
    setFormData(initialState);
    setFile(null);
    const fileInput = document.getElementById('doc-dropzone-file');
    if (fileInput) fileInput.value = null;
  };

  // --- FUNÇÃO DE SUBMIT ATUALIZADA ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.nome_arquivo || !formData.categoria) {
      toast.error("Por favor, preencha o arquivo, nome e categoria.");
      return;
    }
    
    // ATIVA O OVERLAY
    setIsSubmitting(true);
    
    try {
      // 1. Enviar o arquivo
      const pathStorage = await uploadDocumento(file, funcionarioId);
      
      // 2. Salvar o registro no banco
      const dadosRegistro = {
        funcionario_id: funcionarioId,
        nome_arquivo: formData.nome_arquivo,
        path_storage: pathStorage,
        categoria: formData.categoria,
        data_documento: formData.data_documento || null,
      };
      
      // 3. RECEBE o novo documento de volta do banco
      const novoDocumento = await createDocumentoRegistro(dadosRegistro);
      
      // --- APRIMORAMENTO 2: ATUALIZAÇÃO INSTANTÂNEA ---
      // 4. Injeta o novo documento no cache do SWR
      const cacheKey = ['documentos', funcionarioId];
      mutate(cacheKey, (dadosAntigos = []) => {
        // Retorna um novo array com o item novo no topo, seguido dos antigos
        return [novoDocumento, ...dadosAntigos];
      }, { 
        // 'revalidate: false' diz ao SWR: "Não precisa buscar de novo,
        // confie nos dados que eu te dei."
        revalidate: false 
      });
      // --- FIM DO APRIMORAMENTO ---
      
      // 5. Sucesso e Limpeza
      toast.success('Documento salvo com sucesso!');
      handleCancel(); // Limpa o formulário

    } catch (err) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      // DESATIVA O OVERLAY
      setIsSubmitting(false);
    }
  };

  // --- JSX (Não muda nada aqui) ---
  return (
    <div className="doc-upload-form">

      {isSubmitting && (
        <div className="doc-form-loading-overlay">
          <div className="doc-form-spinner"></div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="doc-upload-grid">
          
          {/* Upload */}
          <div className="doc-form-group doc-upload-span-2">
            <label htmlFor="doc-dropzone-file">Arquivo *</label>
            <label className="doc-upload-label" htmlFor="doc-dropzone-file">
              <span className="material-symbols-outlined" style={{fontSize: '40px', color: '#777'}}>cloud_upload</span>
              {file ? (
                <p className="doc-file-name">{file.name}</p>
              ) : (
                <p className="doc-upload-text"><span className="semibold">Clique para enviar</span> ou arraste e solte</p>
              )}
              <input 
                id="doc-dropzone-file" 
                type="file" 
                onChange={handleFileChange} 
                disabled={isSubmitting}
              />
            </label>
          </div>
          
          {/* Nome do Arquivo */}
          <div className="doc-form-group">
            <label htmlFor="doc-nome">Nome do Documento *</label>
            <input 
              id="doc-nome"
              name="nome_arquivo"
              type="text" 
              placeholder="Ex: Contrato de Trabalho"
              value={formData.nome_arquivo}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Categoria (A "Pasta") */}
          <div className="doc-form-group">
            <label htmlFor="doc-categoria">Categoria (Pasta) *</label>
            <input 
              id="doc-categoria"
              name="categoria"
              type="text" 
              placeholder="Ex: Contratual, Pessoal, ASO"
              value={formData.categoria}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Data do Documento */}
          <div className="doc-form-group">
            <label htmlFor="doc-data">Data do Documento (Opcional)</label>
            <input 
              id="doc-data"
              name="data_documento"
              type="date"
              value={formData.data_documento}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="doc-upload-footer">
          <button type="submit" className="doc-button-primary" disabled={isSubmitting}>
            <span className="material-symbols-outlined">save</span>
            {isSubmitting ? 'Salvando...' : 'Salvar Documento'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentoUploadForm;