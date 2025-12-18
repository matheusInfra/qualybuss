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
  
  // ESTADO DA DATA DE REFERÊNCIA (Padrão: Mês atual)
  const [competencia, setCompetencia] = useState(new Date().toISOString().slice(0, 7));

  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  const onDrop = (acceptedFiles) => {
    setFiles(acceptedFiles);
    setProcessedData([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true
  });

  // Normalização de texto (Remove acentos e espaços)
  const normalizeText = (text) => {
    if (!text) return '';
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  };

  const processarArquivos = async () => {
    if (!files.length) return;
    setIsProcessing(true);
    const resultados = [];

    try {
      for (const file of files) {
        const pages = await extractTextFromPDF(file);

        pages.forEach((page) => {
          const pageTextNorm = normalizeText(page.text);
          let match = null;
          let matchType = 'none';

          if (funcionarios) {
            // 1. Tenta pelo NOME
            for (const func of funcionarios) {
              const nomeFuncNorm = normalizeText(func.nome_completo);
              
              if (pageTextNorm.includes(nomeFuncNorm)) {
                match = func;
                const temCBO = checkCBOInText(page.text, func.cbo);
                matchType = temCBO ? 'nome_cbo_ok' : 'nome_apenas';
                break;
              }
            }

            // 2. Se falhar, tenta pelo CBO (Repescagem)
            if (!match) {
              for (const func of funcionarios) {
                if (func.cbo && checkCBOInText(page.text, func.cbo)) {
                  match = func;
                  matchType = 'cbo_divergente'; // Alerta de divergência
                  break;
                }
              }
            }
          }

          resultados.push({
            id: `${file.name}-${page.pageNumber}-${Date.now()}`,
            fileName: file.name,
            pageNumber: page.pageNumber,
            funcionario: match,
            status: match ? 'Encontrado' : 'Não Identificado',
            matchType,
            fileObj: file
          });
        });
      }

      setProcessedData(resultados);
      
      const naoIdentificados = resultados.filter(r => r.status === 'Não Identificado').length;
      const divergentes = resultados.filter(r => r.matchType === 'cbo_divergente').length;

      if (naoIdentificados > 0) toast(`Atenção: ${naoIdentificados} páginas não identificadas.`, { icon: '⚠️' });
      if (divergentes > 0) toast(`${divergentes} encontrados pelo CBO (Nome divergente).`, { icon: 'ℹ️' });
      if (naoIdentificados === 0 && divergentes === 0) toast.success('Todos identificados com sucesso!');

    } catch (error) {
      console.error(error);
      toast.error(error.message || "Erro ao ler PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalizarImportacao = async () => {
    const itensValidos = processedData.filter(d => d.funcionario && d.status === 'Encontrado');
    
    if (!itensValidos.length) {
      toast.error("Nenhum item válido para importar.");
      return;
    }

    if (!competencia) {
      toast.error("Por favor, selecione o Mês de Referência.");
      return;
    }

    setUploading(true);
    let sucesso = 0;

    try {
      for (const item of itensValidos) {
        try {
          // 1. Upload Físico
          const path = await uploadDocumento(item.fileObj, item.funcionario.id);
          
          // 2. Registro no Banco (Usa a competência selecionada)
          await createDocumentoRegistro({
            funcionario_id: item.funcionario.id,
            nome: `Holerite ${competencia}`, // Ex: Holerite 2024-05
            categoria: 'Holerite',
            arquivo_url: path, // path_storage
            tipo_arquivo: 'application/pdf',
            tamanho: item.fileObj.size,
            descricao: item.matchType === 'cbo_divergente' 
              ? `Ref: ${competencia}. (Alerta: Vinculado via CBO, nome divergente).`
              : `Ref: ${competencia}. Pag: ${item.pageNumber}`
          });
          sucesso++;
        } catch (err) {
          console.error(`Erro item ${item.pageNumber}:`, err);
        }
      }
      
      if (sucesso > 0) {
        toast.success(`${sucesso} holerites importados!`);
        setFiles([]);
        setProcessedData([]);
      }
    } catch (e) {
      toast.error("Erro ao salvar dados.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="importador-container fade-in">
      <div className="importador-header">
        <h2>📂 Importador Inteligente de Holerites</h2>
        <p>O sistema busca por <strong>Nome</strong> e confirma pelo <strong>CBO</strong>.</p>
      </div>

      {/* CAMPO DE DATA DE REFERÊNCIA (Restaurado) */}
      <div className="config-box">
        <div className="form-group">
          <label htmlFor="competenciaInput">Mês de Referência (Competência)</label>
          <input 
            id="competenciaInput"
            type="month" 
            className="form-control competencia-input"
            value={competencia} 
            onChange={(e) => setCompetencia(e.target.value)} 
          />
          <small>Esta data será usada no nome do arquivo salvo.</small>
        </div>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Solte o arquivo PDF aqui...</p>
        ) : (
          <div className="drop-content">
            <span className="material-symbols-outlined icon-upload">cloud_upload</span>
            <p>Arraste o PDF de Holerites aqui</p>
            <span className="btn-fake">Selecionar Arquivo</span>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="actions-bar">
          <span>{files.length} arquivo(s) carregado(s)</span>
          <button className="btn btn-primary" onClick={processarArquivos} disabled={isProcessing}>
            {isProcessing ? (
              <span style={{display:'flex', gap:'5px', alignItems:'center'}}>
                <span className="spinner-small"></span> Lendo PDF...
              </span>
            ) : 'Iniciar Identificação'}
          </button>
        </div>
      )}

      {/* Lista de Resultados */}
      {processedData.length > 0 && (
        <div className="preview-list">
          <div className="list-header">
            <span>Pág</span>
            <span>Colaborador Identificado</span>
            <span>Detalhe da Identificação</span>
            <span>Status</span>
          </div>
          <div className="list-body">
            {processedData.map((item) => (
              <div key={item.id} className={`list-item ${item.status === 'Encontrado' ? 'success' : 'warning'}`}>
                <span className="page-badge">{item.pageNumber}</span>
                
                <div className="func-info">
                  <strong>{item.funcionario?.nome_completo || '---'}</strong>
                  {item.funcionario?.cbo && <small>CBO Cadastro: {item.funcionario.cbo}</small>}
                </div>

                <div className="match-info">
                  {item.matchType === 'nome_cbo_ok' && <span className="badge-match high">✅ Nome + CBO</span>}
                  {item.matchType === 'nome_apenas' && <span className="badge-match medium">🔹 Apenas Nome</span>}
                  {item.matchType === 'cbo_divergente' && <span className="badge-match alert">⚠️ CBO (Nome Diferente)</span>}
                  {item.matchType === 'none' && <span className="badge-match none">--</span>}
                </div>

                <span className={`status-text ${item.status === 'Encontrado' ? 'text-green' : 'text-orange'}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <div className="footer-actions">
            <button className="btn btn-secondary" onClick={() => setProcessedData([])}>Limpar Tudo</button>
            <button 
              className="btn btn-success" 
              onClick={handleFinalizarImportacao} 
              disabled={uploading || processedData.every(d => d.status !== 'Encontrado')}
            >
              {uploading ? 'Salvando...' : 'Confirmar Importação'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportadorHolerites;