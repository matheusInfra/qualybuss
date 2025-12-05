import React, { useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getDocumentosPorFuncionario, getDocumentoDownloadUrl, deleteDocumento } from '../../services/documentoService';
import { getFuncionarioById } from '../../services/funcionarioService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import ModalExportacao from './ModalExportacao';
import './Documentos.css';

// --- CONSTANTES E HELPERS (Mantidos) ---
const ICONES_CATEGORIA = {
  "Admissão e Contratuais": "folder_shared",
  "Saúde e Segurança (SST)": "medical_services",
  "Folha e Ponto": "receipt_long",
  "Afastamentos e Licenças": "sick",
  "Jurídico e Disciplinar": "gavel",
  "Outros": "folder_open"
};

const formatarData = (dataStr) => {
  if (!dataStr) return 'Data de upload';
  const data = new Date(dataStr.replace(/-/g, '/'));
  return `Ref: ${data.toLocaleDateString('pt-BR')}`;
};

const GetIconeArquivo = ({ nomeArquivo }) => {
  const ext = nomeArquivo.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return <span className="material-symbols-outlined doc-icon pdf">picture_as_pdf</span>;
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <span className="material-symbols-outlined doc-icon image">image</span>;
  return <span className="material-symbols-outlined doc-icon">description</span>;
};

const agruparPorCategoria = (documentos) => {
  return documentos.reduce((acc, doc) => {
    const categoria = doc.categoria || 'Outros';
    if (!acc[categoria]) acc[categoria] = [];
    acc[categoria].push(doc);
    return acc;
  }, {});
};

function DocumentoLista({ funcionarioId }) {
  const { mutate } = useSWRConfig();
  const [modalState, setModalState] = useState({ isOpen: false, doc: null });
  const [showExport, setShowExport] = useState(false);
  
  // [NOVO] Estado para controlar os IDs selecionados
  const [selectedIds, setSelectedIds] = useState(new Set());

  const swrKey = ['documentos', funcionarioId];
  const { data: documentos, error, isLoading } = useSWR(swrKey, () => getDocumentosPorFuncionario(funcionarioId), { shouldRetryOnError: false });
  const { data: funcionario } = useSWR(['funcionario', funcionarioId], () => getFuncionarioById(funcionarioId));

  // --- LÓGICA DE SELEÇÃO ---
  const toggleSelection = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectCategory = (docsDaCategoria) => {
    const newSet = new Set(selectedIds);
    const allSelected = docsDaCategoria.every(d => newSet.has(d.id));

    if (allSelected) {
      // Desmarcar todos desta categoria
      docsDaCategoria.forEach(d => newSet.delete(d.id));
    } else {
      // Marcar todos desta categoria
      docsDaCategoria.forEach(d => newSet.add(d.id));
    }
    setSelectedIds(newSet);
  };

  // Filtra os objetos completos baseados nos IDs selecionados para enviar ao Modal
  const documentosParaExportar = useMemo(() => {
    if (!documentos) return [];
    return documentos.filter(d => selectedIds.has(d.id));
  }, [documentos, selectedIds]);

  // --- HANDLERS EXISTENTES ---
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

  const handleDeleteClick = (doc) => setModalState({ isOpen: true, doc: doc });

  const handleConfirmDelete = async () => {
    if (!modalState.doc) return;
    const toastId = toast.loading('Excluindo...');
    try {
      await deleteDocumento(modalState.doc.id, modalState.doc.path_storage);
      
      // Remove da seleção se estiver lá
      if (selectedIds.has(modalState.doc.id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(modalState.doc.id);
        setSelectedIds(newSet);
      }

      mutate(swrKey, (docsAtuais) => docsAtuais.filter(d => d.id !== modalState.doc.id), { revalidate: false }); 
      toast.success('Documento excluído!', { id: toastId });
    } catch (err) {
      toast.error(`Erro: ${err.message}`, { id: toastId });
    } finally {
      setModalState({ isOpen: false, doc: null });
    }
  };

  if (isLoading) return <div className="loading-state">Carregando documentos...</div>;
  if (error) return <p className="error-message">Erro ao buscar documentos.</p>;
  if (!documentos || documentos.length === 0) return <div className="doc-list-empty"><p>Nenhum documento salvo.</p></div>;
  
  const documentosAgrupados = agruparPorCategoria(documentos);
  const categorias = Object.keys(documentosAgrupados).sort();

  return (
    <div className="doc-list-container">
      
      {/* BARRA DE AÇÕES */}
      <div className="toolbar-exportacao">
        <div className="selection-info">
          {selectedIds.size > 0 ? (
            <span className="text-blue-600 font-bold">{selectedIds.size} arquivo(s) selecionado(s)</span>
          ) : (
            <span className="text-gray-400">Selecione os arquivos para exportar</span>
          )}
        </div>

        <button 
          onClick={() => setShowExport(true)}
          disabled={selectedIds.size === 0}
          className={`btn-exportar-lote ${selectedIds.size > 0 ? 'active' : ''}`}
        >
          <span className="material-symbols-outlined">archive</span>
          Exportar Selecionados
        </button>
      </div>

      {categorias.map(categoria => {
        const docsCategoria = documentosAgrupados[categoria];
        const todosSelecionados = docsCategoria.every(d => selectedIds.has(d.id));

        return (
          <div key={categoria} className="doc-category-group">
            
            <div className="doc-category-header-row">
              <h2 className="doc-category-title">
                <span className="material-symbols-outlined" style={{color:'#137fec'}}>
                  {ICONES_CATEGORIA[categoria] || 'folder'}
                </span>
                {categoria}
                <span className="count">({docsCategoria.length})</span>
              </h2>

              <button 
                className="btn-select-all" 
                onClick={() => toggleSelectCategory(docsCategoria)}
              >
                {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
            
            <div className="doc-grid-items">
              {docsCategoria.map(doc => {
                const isSelected = selectedIds.has(doc.id);
                return (
                  <div 
                    key={doc.id} 
                    className={`doc-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelection(doc.id)} // Clique no card seleciona
                  >
                    {/* CHECKBOX CUSTOMIZADO */}
                    <div className="doc-checkbox-wrapper">
                      <div className={`custom-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <span className="material-symbols-outlined">check</span>}
                      </div>
                    </div>

                    <div className="doc-info">
                      <GetIconeArquivo nomeArquivo={doc.nome_arquivo} />
                      <div className="doc-details">
                        <span className="doc-name" title={doc.nome_arquivo}>{doc.nome_arquivo}</span>
                        <span className="doc-date">{formatarData(doc.data_documento)}</span>
                      </div>
                    </div>
                    
                    <div className="doc-actions" onClick={e => e.stopPropagation()}>
                      <button className="doc-action-button" title="Baixar" onClick={() => handleDownload(doc.path_storage, doc.nome_arquivo)}>
                        <span className="material-symbols-outlined">download</span>
                      </button>
                      <button className="doc-action-button delete" title="Excluir" onClick={() => handleDeleteClick(doc)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      <ModalConfirmacao
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, doc: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        variant="danger"
      >
        <p>Você tem certeza que deseja excluir <strong>{modalState.doc?.nome_arquivo}</strong>?</p>
      </ModalConfirmacao>

      {/* Passamos os documentos ESPECÍFICOS selecionados */}
      <ModalExportacao 
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        preSelecionados={documentosParaExportar} 
        funcionarioNome={funcionario?.nome_completo || 'Colaborador'}
      />
    </div>
  );
}

export default DocumentoLista;