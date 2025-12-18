import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { uploadDocumento, createDocumentoRegistro } from '../../services/documentoService';
import './Documentos.css';

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
  categoria: CATEGORIAS_FIXAS[0],
  data_documento: '',
  descricao: ''
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
      // Sugere nome do arquivo se o campo estiver vazio
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
    // Limpa o input file visualmente
    const fileInput = document.getElementById('doc-dropzone-file');
    if (fileInput) fileInput.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!funcionarioId) {
      toast.error("Erro: ID do funcionário não encontrado.");
      return;
    }
    if (!file) {
      toast.error("Selecione um arquivo para enviar.");
      return;
    }
    if (!formData.nome_arquivo) {
      toast.error("O nome do documento é obrigatório.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Upload Físico
      const pathStorage = await uploadDocumento(file, funcionarioId);
      
      // 2. Registro no Banco (Agora o service aceita esses nomes de campo)
      const dadosRegistro = {
        funcionario_id: funcionarioId,
        nome_arquivo: formData.nome_arquivo,
        path_storage: pathStorage,
        categoria: formData.categoria,
        tipo_arquivo: file.type,  // Importante para ícones
        tamanho: file.size,       // Importante para metadados
        data_documento: formData.data_documento || new Date(),
        descricao: formData.descricao || null
      };
      
      const novoDocumento = await createDocumentoRegistro(dadosRegistro);
      
      // 3. Atualiza a lista na tela sem recarregar
      const cacheKey = ['documentos', funcionarioId];
      mutate(cacheKey, (dadosAntigos = []) => {
        return [novoDocumento, ...dadosAntigos];
      }, { revalidate: false });
      
      toast.success('Documento salvo com sucesso!');
      handleCancel();

    } catch (err) {
      console.error(err);
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
              <span className="material-symbols-outlined doc-upload-icon">cloud_upload</span>
              {file ? (
                <p className="doc-file-name">
                  <span className="material-symbols-outlined" style={{fontSize:'20px'}}>description</span>
                  {file.name}
                </p>
              ) : (
                <p className="doc-upload-text"><span className="semibold">Clique para selecionar</span> ou arraste</p>
              )}
              <input 
                id="doc-dropzone-file" 
                type="file" 
                onChange={handleFileChange} 
                disabled={isSubmitting}
              />
            </label>
          </div>
          
          {/* Campos de Texto */}
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

          <div className="doc-form-group">
            <label htmlFor="doc-categoria">Categoria *</label>
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

          <div className="doc-form-group">
            <label htmlFor="doc-desc">Descrição (Opcional)</label>
            <input 
              id="doc-desc"
              name="descricao"
              type="text"
              placeholder="Observações adicionais..."
              value={formData.descricao}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="doc-upload-footer">
          <button type="submit" className="doc-button-primary" disabled={isSubmitting || !file}>
            <span className="material-symbols-outlined">save</span>
            {isSubmitting ? 'Salvando...' : 'Salvar Documento'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentoUploadForm;