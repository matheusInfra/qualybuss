import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { uploadDocumento, createDocumentoRegistro } from '../../services/documentoService';
import './Documentos.css';

// --- DEFINIÇÃO DAS CATEGORIAS PADRÃO ---
const CATEGORIAS_FIXAS = [
  "Admissão e Contratuais",
  "Saúde e Segurança (SST)",
  "Folha e Ponto",
  "Afastamentos e Licenças",
  "Jurídico e Disciplinar",
  "Outros"
];

const initialState = {
  nome_arquivo: '',
  categoria: CATEGORIAS_FIXAS[0], // Começa selecionando a primeira
  data_documento: '',
};

function DocumentoUploadForm({ funcionarioId }) {
  const [formData, setFormData] = useState(initialState);
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { mutate } = useSWRConfig();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Se o nome ainda estiver vazio, preenche com o nome do arquivo
      if (formData.nome_arquivo === '') {
        setFormData(prev => ({ ...prev, nome_arquivo: selectedFile.name }));
      }
    } else {
      setFile(null);
    }
  };
  
  const handleCancel = () => {
    setFormData(initialState);
    setFile(null);
    const fileInput = document.getElementById('doc-dropzone-file');
    if (fileInput) fileInput.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !formData.nome_arquivo || !formData.categoria) {
      toast.error("Por favor, preencha o arquivo, nome e categoria.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Upload físico
      const pathStorage = await uploadDocumento(file, funcionarioId);
      
      // 2. Registro no banco
      const dadosRegistro = {
        funcionario_id: funcionarioId,
        nome_arquivo: formData.nome_arquivo,
        path_storage: pathStorage,
        categoria: formData.categoria,
        data_documento: formData.data_documento || null,
      };
      
      const novoDocumento = await createDocumentoRegistro(dadosRegistro);
      
      // 3. Atualização otimista da lista
      const cacheKey = ['documentos', funcionarioId];
      mutate(cacheKey, (dadosAntigos = []) => {
        return [novoDocumento, ...dadosAntigos];
      }, { revalidate: false });
      
      toast.success('Documento salvo na pasta correta!');
      handleCancel();

    } catch (err) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="doc-upload-form">

      {isSubmitting && (
        <div className="doc-form-loading-overlay">
          <div className="doc-form-spinner"></div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="doc-upload-grid">
          
          {/* Área de Upload */}
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
          
          {/* Nome do Documento */}
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

          {/* SELEÇÃO DE CATEGORIA (Agora é um Select) */}
          <div className="doc-form-group">
            <label htmlFor="doc-categoria">Pasta / Categoria *</label>
            <select 
              id="doc-categoria"
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              disabled={isSubmitting}
              required
            >
              {CATEGORIAS_FIXAS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Data Opcional */}
          <div className="doc-form-group">
            <label htmlFor="doc-data">Data de Referência</label>
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
            {isSubmitting ? 'Arquivando...' : 'Salvar Documento'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentoUploadForm;