import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';
import { downloadArquivoParaBlob } from '../../services/documentoService';
import './Documentos.css';

export default function ModalExportacao({ isOpen, onClose, preSelecionados = [], funcionarioNome }) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  
  // Se não vier pré-selecionado, usamos datas (Fallback)
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setProgresso(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isManualMode = preSelecionados && preSelecionados.length > 0;

  const handleExportar = async () => {
    // Define qual lista usar
    let listaFinal = [];

    if (isManualMode) {
      listaFinal = preSelecionados;
    } else {
      // Lógica antiga de filtro por data (caso queira manter como fallback)
      // Se não quiser, pode remover este bloco else
      toast.error("Nenhum documento selecionado.");
      return;
    }

    setLoading(true);
    setProgresso(0);
    const zip = new JSZip();
    
    const nomePastaRaiz = `Dossie_${funcionarioNome.replace(/\s+/g, '_')}`;
    const folder = zip.folder(nomePastaRaiz);

    // 1. CSV de Índice
    let conteudoCSV = "Nome do Arquivo;Categoria;Data Referencia;Data Upload\n";
    listaFinal.forEach(doc => {
      const dataRef = doc.data_documento ? new Date(doc.data_documento).toLocaleDateString('pt-BR') : '-';
      const dataUp = new Date(doc.created_at).toLocaleDateString('pt-BR');
      conteudoCSV += `${doc.nome_arquivo};${doc.categoria};${dataRef};${dataUp}\n`;
    });
    folder.file("00_PROTOCOLO_ENTREGA.csv", conteudoCSV);

    // 2. Processamento
    try {
      let processados = 0;
      for (const doc of listaFinal) {
        try {
          // Atualiza UI antes de começar o download pesado
          const blob = await downloadArquivoParaBlob(doc.path_storage);
          
          const extensaoOriginal = doc.path_storage.split('.').pop();
          // Remove caracteres inválidos para Windows/Linux
          const nomeLimpo = doc.nome_arquivo.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 60);
          const nomeFinal = `${nomeLimpo}.${extensaoOriginal}`;

          folder.file(nomeFinal, blob);
        } catch (err) {
          console.error(`Erro no arquivo: ${doc.nome_arquivo}`, err);
          folder.file(`ERRO_DOWNLOAD_${doc.id}.txt`, `Falha ao baixar: ${doc.nome_arquivo}`);
        }

        processados++;
        setProgresso(Math.round((processados / listaFinal.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${nomePastaRaiz}_${new Date().toISOString().split('T')[0]}.zip`);
      
      toast.success("Exportação concluída!");
      onClose();

    } catch (error) {
      toast.error("Falha crítica na exportação.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{maxWidth: '500px'}}>
        <div className="modal-header">
          <h2>Exportar Documentos</h2>
          <button onClick={onClose} className="btn-close-modal">×</button>
        </div>

        <div className="modal-form">
          {isManualMode ? (
            <div className="manual-mode-info">
              <div style={{textAlign: 'center', padding: '20px 0'}}>
                <span className="material-symbols-outlined" style={{fontSize: '48px', color: '#137fec'}}>folder_zip</span>
                <h3 style={{margin: '10px 0', color: '#1e293b'}}>Confirmação de Pacote</h3>
                <p style={{color: '#64748b'}}>
                  Você selecionou <strong>{preSelecionados.length} documentos</strong> manualmente.
                </p>
              </div>
              <div style={{background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '150px', overflowY: 'auto'}}>
                <ul style={{margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#475569'}}>
                  {preSelecionados.map(d => (
                    <li key={d.id}>{d.nome_arquivo}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Nenhum documento selecionado.</p>
          )}

          {loading && (
            <div style={{marginTop: '20px'}}>
              <div className="progress-track">
                <div className="progress-fill" style={{width: `${progresso}%`}}></div>
              </div>
              <p style={{textAlign: 'center', fontSize: '0.8rem', marginTop: '5px', color: '#64748b'}}>
                Compactando... {progresso}%
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel" disabled={loading}>Cancelar</button>
          <button 
            onClick={handleExportar} 
            className="btn-save" 
            disabled={loading || preSelecionados.length === 0}
          >
            {loading ? 'Gerando ZIP...' : 'Baixar Arquivo ZIP'}
          </button>
        </div>
      </div>
    </div>
  );
}