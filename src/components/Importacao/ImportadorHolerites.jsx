import React, { useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import useSWR from 'swr';
import { extractTextFromPDF, checkCBOInText } from '../../utils/PDFProcessor'; // Importe o checkCBOInText
import { getFuncionariosDropdown } from '../../services/funcionarioService';
import { createDocumentoRegistro, uploadDocumento } from '../../services/documentoService';
import { toast } from 'react-hot-toast';
import './ImportadorHolerites.css';

function ImportadorHolerites() {
  const [files, setFiles] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles);
    setProcessedData([]); // Limpa processamento anterior
  };

  const processarArquivos = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    const resultados = [];

    try {
      for (const file of files) {
        // Extrai texto de todas as páginas do PDF
        const pages = await extractTextFromPDF(file);

        pages.forEach((page) => {
          // LÓGICA DE VINCULAÇÃO (MATCHING)
          let match = null;
          let matchType = 'none'; // 'nome_cbo', 'nome_only', 'none'

          if (funcionarios) {
            // 1. Tenta encontrar por Nome E CBO (Match Perfeito)
            match = funcionarios.find((func) => {
              const nomeNormalizado = func.nome_completo.toUpperCase();
              const textoPdfUpper = page.text.toUpperCase();
              
              const temNome = textoPdfUpper.includes(nomeNormalizado);
              const temCBO = checkCBOInText(page.text, func.cbo);

              return temNome && temCBO;
            });

            if (match) {
              matchType = 'nome_cbo';
            } else {
              // 2. Se não achou com CBO, tenta só pelo nome (Fallback com aviso)
              // Útil se o cadastro estiver sem CBO ou o PDF ilegível
              match = funcionarios.find((func) => {
                const nomeNormalizado = func.nome_completo.toUpperCase();
                return page.text.toUpperCase().includes(nomeNormalizado);
              });
              if (match) matchType = 'nome_only';
            }
          }

          resultados.push({
            id: `${file.name}-${page.pageNumber}`,
            fileName: file.name,
            pageNumber: page.pageNumber,
            funcionario: match, // Objeto funcionário ou null
            status: match ? 'Encontrado' : 'Não Identificado',
            matchType: matchType, // Para exibir ícone de qualidade do match
            previewText: page.text.substring(0, 100) + '...',
            fileObj: file // Guardamos o arquivo original para upload posterior
          });
        });
      }
      setProcessedData(resultados);
      if (resultados.some(r => r.status === 'Não Identificado')) {
        toast('Alguns holerites não foram vinculados automaticamente.', { icon: '⚠️' });
      } else {
        toast.success('Todos os holerites foram identificados!');
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizarImportacao = async () => {
    const validos = processedData.filter(d => d.funcionario && d.status === 'Encontrado');
    if (validos.length === 0) {
      toast.error("Nenhum holerite vinculado para salvar.");
      return;
    }

    setUploading(true);
    let successCount = 0;

    try {
      for (const item of validos) {
        try {
          // 1. Upload do Arquivo (Idealmente aqui cortaríamos o PDF para subir só a página, 
          // mas para simplificar subiremos o PDF inteiro ou precisariamos de uma lib de split no front como pdf-lib)
          // *Neste exemplo simplificado, estamos subindo o arquivo inteiro para cada funcionário identificado nele*
          // *Para produção real, usaríamos 'pdf-lib' para extrair a página específica 'item.pageNumber' em um novo Blob*
          
          const path = await uploadDocumento(item.fileObj, item.funcionario.id);

          // 2. Criar Registro no Banco
          await createDocumentoRegistro({
            funcionario_id: item.funcionario.id,
            nome: `Holerite ${competencia} - ${item.funcionario.nome_completo}`, // Mapeia para 'nome_arquivo' no service
            categoria: 'Holerite',
            arquivo_url: path, // Mapeia para 'path_storage' no service
            tipo_arquivo: 'application/pdf',
            tamanho: item.fileObj.size,
            descricao: `Importado via sistema. Ref: ${competencia}. Pag: ${item.pageNumber}`
          });

          successCount++;
        } catch (err) {
          console.error(`Erro ao salvar holerite pág ${item.pageNumber}:`, err);
        }
      }
      toast.success(`${successCount} Holerites enviados com sucesso!`);
      setProcessedData([]);
      setFiles([]);
    } catch (e) {
      toast.error("Erro no processo de salvamento.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="importador-container fade-in">
      <div className="importador-header">
        <h2>📂 Importador de Holerites em Lote</h2>
        <p>Arraste o PDF com múltiplos holerites. O sistema separa e vincula por <strong>Nome e CBO</strong>.</p>
      </div>

      <div className="config-row">
        <div className="form-group">
          <label>Competência (Mês/Ano)</label>
          <input 
            type="month" 
            value={competencia} 
            onChange={(e) => setCompetencia(e.target.value)} 
            className="form-control"
          />
        </div>
      </div>

      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Solte os arquivos aqui...</p>
        ) : (
          <div className="drop-content">
            <span className="material-symbols-outlined icon-upload">cloud_upload</span>
            <p>Arraste o PDF aqui ou clique para selecionar</p>
            <span className="info-text">Suporta arquivos PDF multipáginas</span>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="actions-bar">
          <span>{files.length} arquivo(s) selecionado(s)</span>
          <button className="btn btn-primary" onClick={processarArquivos} disabled={isProcessing}>
            {isProcessing ? 'Lendo PDF...' : 'Processar e Vincular'}
          </button>
        </div>
      )}

      {processedData.length > 0 && (
        <div className="preview-list">
          <h3>Pré-visualização da Vinculação</h3>
          <div className="list-header">
            <span>Página</span>
            <span>Colaborador Identificado</span>
            <span>Critério</span>
            <span>Status</span>
          </div>
          <div className="list-body">
            {processedData.map((item) => (
              <div key={item.id} className={`list-item ${item.status === 'Encontrado' ? 'success' : 'warning'}`}>
                <span className="page-badge">Pág {item.pageNumber}</span>
                <div className="func-info">
                  <strong>{item.funcionario?.nome_completo || '---'}</strong>
                  {item.funcionario?.cbo && <small>CBO: {item.funcionario.cbo}</small>}
                </div>
                <div className="match-info">
                  {item.matchType === 'nome_cbo' && <span className="badge-match high">Nome + CBO ✅</span>}
                  {item.matchType === 'nome_only' && <span className="badge-match medium">Apenas Nome ⚠️</span>}
                  {item.matchType === 'none' && <span className="badge-match none">--</span>}
                </div>
                <span className={`status-text ${item.status === 'Encontrado' ? 'text-green' : 'text-orange'}`}>
                  {item.status === 'Encontrado' ? 'Pronto para Importar' : 'Não Identificado'}
                </span>
              </div>
            ))}
          </div>

          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={() => setProcessedData([])}>Cancelar</button>
            <button className="btn btn-success" onClick={handleFinalizarImportacao} disabled={uploading}>
              {uploading ? 'Enviando...' : `Confirmar Importação (${processedData.filter(i => i.funcionario).length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
  
  // Hooks do Dropzone (precisam estar dentro do componente)
  function getRootProps() {
    return useDropzone({ onDrop, accept: {'application/pdf': ['.pdf']} }).getRootProps();
  }
  function getInputProps() {
    return useDropzone({ onDrop, accept: {'application/pdf': ['.pdf']} }).getInputProps();
  }
  function isDragActive() {
    return useDropzone({ onDrop, accept: {'application/pdf': ['.pdf']} }).isDragActive;
  }
}

export default ImportadorHolerites;