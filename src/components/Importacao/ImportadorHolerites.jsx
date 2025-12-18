import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import useSWR from 'swr';
import { extractTextFromPDF, checkCBOInText } from '../../utils/PDFProcessor';
import { getFuncionariosDropdown } from '../../services/funcionarioService';
import { createDocumentoRegistro, uploadDocumento } from '../../services/documentoService';
import { toast } from 'react-hot-toast';
import './ImportadorHolerites.css';

function ImportadorHolerites() {
  const [files, setFiles] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Define o mês atual como padrão (YYYY-MM)
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));

  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles);
    setProcessedData([]); // Limpa dados anteriores ao trocar o arquivo
  };

  // Configuração correta do Hook no nível superior
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  const processarArquivos = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    const resultados = [];

    try {
      for (const file of files) {
        // Extrai texto usando o utilitário
        const pages = await extractTextFromPDF(file);

        pages.forEach((page) => {
          let match = null;
          let matchType = 'none';

          if (funcionarios) {
            // 1. Tenta Match Exato: NOME + CBO
            match = funcionarios.find((func) => {
              const nomeFunc = func.nome_completo.toUpperCase();
              const textoPdf = page.text.toUpperCase();
              
              const temNome = textoPdf.includes(nomeFunc);
              // Verifica CBO se o funcionário tiver um cadastrado
              const temCBO = checkCBOInText(page.text, func.cbo);

              return temNome && temCBO;
            });

            if (match) {
              matchType = 'nome_cbo';
            } else {
              // 2. Fallback: Match apenas por NOME
              match = funcionarios.find((func) => {
                return page.text.toUpperCase().includes(func.nome_completo.toUpperCase());
              });
              if (match) matchType = 'nome_only';
            }
          }

          resultados.push({
            id: `${file.name}-${page.pageNumber}-${Date.now()}`,
            fileName: file.name,
            pageNumber: page.pageNumber,
            funcionario: match,
            status: match ? 'Encontrado' : 'Não Identificado',
            matchType,
            fileObj: file // Guarda referência para upload
          });
        });
      }

      setProcessedData(resultados);
      
      if (resultados.some(r => r.status === 'Não Identificado')) {
        toast('Alguns holerites não foram identificados.', { icon: '⚠️' });
      } else {
        toast.success('Processamento concluído!');
      }

    } catch (error) {
      console.error("Erro ao processar PDF:", error);
      toast.error("Falha ao ler o arquivo PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizarImportacao = async () => {
    const itensValidos = processedData.filter(d => d.funcionario && d.status === 'Encontrado');
    
    if (itensValidos.length === 0) {
      toast.error("Nenhum item válido para importar.");
      return;
    }

    setUploading(true);
    let sucesso = 0;

    try {
      for (const item of itensValidos) {
        try {
          // 1. Upload do Arquivo Físico
          const path = await uploadDocumento(item.fileObj, item.funcionario.id);

          // 2. Registro no Banco
          await createDocumentoRegistro({
            funcionario_id: item.funcionario.id,
            nome: `Holerite ${competencia}`, // Nome amigável
            categoria: 'Holerite',
            arquivo_url: path, // Path Storage
            tipo_arquivo: 'application/pdf',
            tamanho: item.fileObj.size,
            descricao: `Ref: ${competencia}. Pag: ${item.pageNumber}. Importação Automática.`
          });

          sucesso++;
        } catch (err) {
          console.error(`Falha no item ${item.pageNumber}:`, err);
        }
      }
      
      if (sucesso > 0) {
        toast.success(`${sucesso} holerites importados com sucesso!`);
        setFiles([]);
        setProcessedData([]);
      } else {
        toast.error("Falha ao salvar os documentos.");
      }
    } catch (e) {
      toast.error("Erro geral na importação.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="importador-container fade-in">
      <div className="importador-header">
        <h2>📂 Importador de Holerites</h2>
        <p>O sistema vinculará páginas automaticamente por <strong>Nome</strong> e <strong>CBO</strong>.</p>
      </div>

      <div className="config-row">
        <div className="form-group">
          <label>Competência</label>
          <input 
            type="month" 
            className="form-control"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
          />
        </div>
      </div>

      {/* Área de Dropzone */}
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Solte o PDF aqui...</p>
        ) : (
          <div className="drop-content">
            <span className="material-symbols-outlined icon-upload">cloud_upload</span>
            <p>Arraste o PDF de holerites aqui</p>
            <small>Clique para selecionar</small>
          </div>
        )}
      </div>

      {/* Barra de Ações */}
      {files.length > 0 && (
        <div className="actions-bar">
          <span>{files.length} arquivo(s) carregado(s)</span>
          <button 
            className="btn btn-primary" 
            onClick={processarArquivos} 
            disabled={isProcessing}
          >
            {isProcessing ? 'Lendo...' : 'Processar Identificação'}
          </button>
        </div>
      )}

      {/* Lista de Resultados */}
      {processedData.length > 0 && (
        <div className="preview-list">
          <div className="list-header">
            <span>Pág</span>
            <span>Funcionário</span>
            <span>Critério</span>
            <span>Status</span>
          </div>
          <div className="list-body">
            {processedData.map((item) => (
              <div key={item.id} className={`list-item ${item.status === 'Encontrado' ? 'success' : 'warning'}`}>
                <span className="page-badge">{item.pageNumber}</span>
                
                <div className="func-info">
                  <strong>{item.funcionario?.nome_completo || '---'}</strong>
                  {item.funcionario?.cbo && <small>CBO: {item.funcionario.cbo}</small>}
                </div>

                <div className="match-info">
                  {item.matchType === 'nome_cbo' && <span className="badge-match high">Nome + CBO</span>}
                  {item.matchType === 'nome_only' && <span className="badge-match medium">Apenas Nome</span>}
                  {item.matchType === 'none' && <span className="badge-match none">--</span>}
                </div>

                <span className={`status-text ${item.status === 'Encontrado' ? 'text-green' : 'text-orange'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>

          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={() => setProcessedData([])}>Limpar</button>
            <button 
              className="btn btn-success" 
              onClick={handleFinalizarImportacao} 
              disabled={uploading || processedData.every(d => d.status !== 'Encontrado')}
            >
              {uploading ? 'Enviando...' : 'Confirmar Importação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportadorHolerites;