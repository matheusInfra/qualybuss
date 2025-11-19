import React from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getDocumentosPorFuncionario, getDocumentoDownloadUrl, deleteDocumento } from '../../services/documentoService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import './Documentos.css';

// ... (helpers formatarData, GetIconeArquivo, agruparPorCategoria não mudam) ...
// Helper para formatar data
const formatarData = (dataStr) => {
  if (!dataStr) return 'Data de upload';
  const data = new Date(dataStr.replace(/-/g, '/'));
  return `Documento de ${data.toLocaleDateString('pt-BR')}`;
};
// Helper para ícone
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
// Helper para agrupar por "pasta" (categoria)
const agruparPorCategoria = (documentos) => {
  return documentos.reduce((acc, doc) => {
    const categoria = doc.categoria || 'Geral';
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

  // 1. Busca os documentos usando SWR
  const swrKey = ['documentos', funcionarioId];
  const { 
    data: documentos, 
    error, 
    isLoading 
  } = useSWR(
    swrKey, 
    () => getDocumentosPorFuncionario(funcionarioId),
    {
      // --- ESTA É A CORREÇÃO PARA O LOOP ---
      // Atende ao seu pedido de não sobrecarregar
      shouldRetryOnError: false
    }
  );

  // 2. Handlers de Ação (Download e Delete)
  const handleDownload = async (pathStorage, nomeArquivo) => {
    toast.loading('Gerando link de download...');
    try {
      const url = await getDocumentoDownloadUrl(pathStorage);
      toast.dismiss();
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nomeArquivo);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.dismiss();
      toast.error(`Erro ao baixar: ${err.message}`);
    }
  };

  const handleDeleteClick = (doc) => {
    setModalState({ isOpen: true, doc: doc });
  };

  const handleConfirmDelete = async () => {
    if (!modalState.doc) return;
    toast.loading('Excluindo documento...');
    try {
      await deleteDocumento(modalState.doc.id, modalState.doc.path_storage);
      
      // Mutação Otimista
      mutate(swrKey, (docsAtuais) => {
        return docsAtuais.filter(d => d.id !== modalState.doc.id);
      }, { revalidate: false }); 

      toast.dismiss();
      toast.success('Documento excluído!');
      
    } catch (err) {
      toast.dismiss();
      toast.error(`Erro ao excluir: ${err.message}`);
    } finally {
      setModalState({ isOpen: false, doc: null });
    }
  };

  // 3. Renderização
  if (isLoading) return <p>Carregando documentos...</p>;
  if (error) {
    // Agora o erro para aqui e não fica em loop
    return <p className="error-message">Erro ao buscar documentos: {error.message}</p>;
  }
  if (documentos.length === 0) {
    return <div className="doc-list-empty"><p>Nenhum documento salvo para este colaborador.</p></div>;
  }
  
  // 4. Agrupa por categoria
  const documentosAgrupados = agruparPorCategoria(documentos);
  const categorias = Object.keys(documentosAgrupados).sort();

  return (
    <div className="doc-list-container">
      {categorias.map(categoria => (
        <div key={categoria} className="doc-category-group">
          <h2 className="doc-category-header">{categoria}</h2>
          
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
      ))}
      
      {/* 5. Modal de Confirmação */}
      <ModalConfirmacao
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, doc: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
      >
        <p>Você tem certeza que deseja excluir o documento <strong>{modalState.doc?.nome_arquivo}</strong>?</p>
        <p>Esta ação não pode ser desfeita.</p>
      </ModalConfirmacao>
    </div>
  );
}

export default DocumentoLista;