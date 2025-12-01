import React from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getDocumentosPorFuncionario, getDocumentoDownloadUrl, deleteDocumento } from '../../services/documentoService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import './Documentos.css';

// --- ÍCONES PARA CADA TIPO DE PASTA ---
const ICONES_CATEGORIA = {
  "Admissão e Contratuais": "folder_shared",
  "Saúde e Segurança (SST)": "medical_services",
  "Folha e Ponto": "receipt_long",
  "Afastamentos e Licenças": "sick",
  "Jurídico e Disciplinar": "gavel",
  "Outros": "folder_open"
};

// Helper Data
const formatarData = (dataStr) => {
  if (!dataStr) return 'Data de upload';
  const data = new Date(dataStr.replace(/-/g, '/'));
  return `Ref: ${data.toLocaleDateString('pt-BR')}`;
};

// Helper Ícone do Arquivo (PDF/Imagem)
const GetIconeArquivo = ({ nomeArquivo }) => {
  const ext = nomeArquivo.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) {
    return <span className="material-symbols-outlined doc-icon pdf">picture_as_pdf</span>;
  }
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
    return <span className="material-symbols-outlined doc-icon image">image</span>;
  }
  return <span className="material-symbols-outlined doc-icon">description</span>;
};

// Helper Agrupamento
const agruparPorCategoria = (documentos) => {
  return documentos.reduce((acc, doc) => {
    const categoria = doc.categoria || 'Outros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(doc);
    return acc;
  }, {});
};

function DocumentoLista({ funcionarioId }) {
  const { mutate } = useSWRConfig();
  const [modalState, setModalState] = React.useState({ isOpen: false, doc: null });

  const swrKey = ['documentos', funcionarioId];
  
  const { 
    data: documentos, 
    error, 
    isLoading 
  } = useSWR(
    swrKey, 
    () => getDocumentosPorFuncionario(funcionarioId),
    { shouldRetryOnError: false }
  );

  const handleDownload = async (pathStorage, nomeArquivo) => {
    const toastId = toast.loading('Gerando link...');
    try {
      const url = await getDocumentoDownloadUrl(pathStorage);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.dismiss(toastId);
    } catch (err) {
      toast.error(`Erro: ${err.message}`, { id: toastId });
    }
  };

  const handleDeleteClick = (doc) => {
    setModalState({ isOpen: true, doc: doc });
  };

  const handleConfirmDelete = async () => {
    if (!modalState.doc) return;
    const toastId = toast.loading('Excluindo...');
    
    try {
      await deleteDocumento(modalState.doc.id, modalState.doc.path_storage);
      
      mutate(swrKey, (docsAtuais) => {
        return docsAtuais.filter(d => d.id !== modalState.doc.id);
      }, { revalidate: false }); 

      toast.success('Documento excluído!', { id: toastId });
      
    } catch (err) {
      toast.error(`Erro: ${err.message}`, { id: toastId });
    } finally {
      setModalState({ isOpen: false, doc: null });
    }
  };

  if (isLoading) return <div className="loading-state">Carregando documentos...</div>;
  if (error) return <p className="error-message">Erro ao buscar documentos.</p>;
  if (!documentos || documentos.length === 0) {
    return <div className="doc-list-empty"><p>Nenhum documento salvo para este colaborador.</p></div>;
  }
  
  const documentosAgrupados = agruparPorCategoria(documentos);
  // Ordena as categorias (fixas primeiro, depois outras se houver lixo no banco)
  const categorias = Object.keys(documentosAgrupados).sort();

  return (
    <div className="doc-list-container">
      {categorias.map(categoria => (
        <div key={categoria} className="doc-category-group">
          
          {/* CABEÇALHO DA PASTA COM ÍCONE */}
          <h2 className="doc-category-header" style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <span className="material-symbols-outlined" style={{color:'#137fec'}}>
              {ICONES_CATEGORIA[categoria] || 'folder'}
            </span>
            {categoria}
            <span style={{fontSize:'0.8rem', color:'#999', fontWeight:'normal'}}>
              ({documentosAgrupados[categoria].length})
            </span>
          </h2>
          
          <div className="doc-grid-items">
            {documentosAgrupados[categoria].map(doc => (
              <div key={doc.id} className="doc-item">
                <div className="doc-info">
                  <GetIconeArquivo nomeArquivo={doc.nome_arquivo} />
                  <div className="doc-details">
                    <span className="doc-name">{doc.nome_arquivo}</span>
                    <span className="doc-date">{formatarData(doc.data_documento)}</span>
                  </div>
                </div>
                
                <div className="doc-actions">
                  <button 
                    className="doc-action-button"
                    title="Baixar"
                    onClick={() => handleDownload(doc.path_storage, doc.nome_arquivo)}
                  >
                    <span className="material-symbols-outlined">download</span>
                  </button>
                  <button 
                    className="doc-action-button delete"
                    title="Excluir"
                    onClick={() => handleDeleteClick(doc)}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <ModalConfirmacao
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, doc: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        variant="danger"
      >
        <p>Você tem certeza que deseja excluir <strong>{modalState.doc?.nome_arquivo}</strong>?</p>
      </ModalConfirmacao>
    </div>
  );
}

export default DocumentoLista;