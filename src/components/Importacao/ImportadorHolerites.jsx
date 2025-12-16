import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { processarPDFHolerites } from '../../utils/PDFProcessor';
import { getFuncionariosDropdown } from '../../services/funcionarioService';
import { uploadDocumento, createDocumentoRegistro } from '../../services/documentoService';
import './ImportadorHolerites.css';

export default function ImportadorHolerites({ onSuccess }) {
  const [file, setFile] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  // 1. Carrega lista de funcionários para o "Match" de nomes
  useEffect(() => {
    const loadFuncs = async () => {
      try {
        const data = await getFuncionariosDropdown();
        setFuncionarios(data || []);
      } catch (error) {
        console.error("Erro ao carregar funcionários:", error);
        toast.error("Erro ao carregar lista de colaboradores.");
      }
    };
    loadFuncs();
  }, []);

  // 2. Processa o PDF assim que selecionado
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      return toast.error("Por favor, selecione um arquivo PDF.");
    }

    setFile(selectedFile);
    setLoading(true);
    setResultados([]);

    try {
      // Chama o processador que divide as páginas e busca nomes
      const paginasProcessadas = await processarPDFHolerites(selectedFile, funcionarios);
      setResultados(paginasProcessadas);
      toast.success(`${paginasProcessadas.length} páginas processadas.`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar PDF: " + error.message);
      setFile(null); // Reseta para tentar de novo
    } finally {
      setLoading(false);
    }
  };

  // 3. Permite corrigir o funcionário manualmente se o sistema errou ou não achou
  const handleFuncionarioChange = (index, funcionarioId) => {
    const novosResultados = [...resultados];
    const funcEncontrado = funcionarios.find(f => f.id === funcionarioId);
    
    novosResultados[index].funcionario = funcEncontrado;
    // Se selecionou alguém, fica verde (success), se limpou, fica amarelo (warning)
    novosResultados[index].status = funcEncontrado ? 'success' : 'warning';
    
    setResultados(novosResultados);
  };

  // 4. Envia para o Módulo de Documentos
  const handleFinalizarImportacao = async () => {
    // Filtra apenas os que têm funcionário vinculado
    const itensValidos = resultados.filter(r => r.funcionario && r.status !== 'ignore');
    
    if (itensValidos.length === 0) {
      return toast.error("Nenhum holerite válido (com colaborador identificado) para importar.");
    }

    setUploading(true);
    setProgresso({ atual: 0, total: itensValidos.length });

    let sucessos = 0;
    let erros = 0;

    for (const item of itensValidos) {
      try {
        // A. Upload do Arquivo Físico (Storage)
        // Converte o Blob (da memória) em um File para upload
        // Remove caracteres especiais do nome do arquivo para evitar erros no Storage
        const nomeArquivoLimpo = `Holerite_${item.competencia.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
        const arquivoParaUpload = new File([item.arquivo], nomeArquivoLimpo, { type: 'application/pdf' });

        const pathStorage = await uploadDocumento(arquivoParaUpload, item.funcionario.id);

        // B. Criação do Registro no Banco (Tabela Documentos)
        await createDocumentoRegistro({
          funcionario_id: item.funcionario.id,
          nome: `Holerite - ${item.competencia}`,
          categoria: 'Holerite',
          data_documento: new Date().toISOString().split('T')[0], // Data de hoje YYYY-MM-DD
          arquivo_url: pathStorage, // Caminho salvo no bucket
          tipo_arquivo: 'application/pdf',
          tamanho: item.arquivo.size,
          descricao: `Importado automaticamente via Importador de Holerites.`
        });

        sucessos++;
      } catch (error) {
        console.error(`Erro ao salvar holerite pág ${item.numero_pagina}:`, error);
        erros++;
      }

      // Atualiza barra de progresso
      setProgresso(prev => ({ ...prev, atual: prev.atual + 1 }));
    }

    setUploading(false);
    
    if (erros > 0) {
      toast.error(`Importação finalizada com ${erros} erros. ${sucessos} salvos.`);
    } else {
      toast.success(`Sucesso! ${sucessos} holerites importados e arquivados.`);
    }
    
    if (onSuccess) onSuccess();
    
    // Limpa a tela se tudo deu certo
    if (sucessos > 0 && erros === 0) {
      setResultados([]);
      setFile(null);
    }
  };

  return (
    <div className="holerites-container">
      
      {/* AREA DE UPLOAD */}
      {!file && (
        <div className="upload-area">
          <input 
            type="file" 
            id="pdf-upload" 
            accept="application/pdf" 
            onChange={handleFileChange} 
            hidden 
          />
          <label htmlFor="pdf-upload" className="upload-label">
            <span className="material-symbols-outlined icon-xl">cloud_upload</span>
            <h3>Clique para selecionar o PDF Único</h3>
            <p>O sistema irá separar as páginas e identificar os colaboradores automaticamente.</p>
          </label>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Lendo arquivo, separando páginas e identificando nomes...</p>
        </div>
      )}

      {/* LISTA DE RESULTADOS (PREVIEW) */}
      {resultados.length > 0 && !uploading && (
        <div className="preview-area">
          <div className="preview-header">
            <h3>Resultado da Análise ({resultados.length} páginas)</h3>
            <div className="actions">
              <button className="btn-secondary" onClick={() => {setFile(null); setResultados([])}}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleFinalizarImportacao}>
                <span className="material-symbols-outlined">save</span>
                Confirmar e Importar
              </button>
            </div>
          </div>

          <div className="grid-holerites">
            {resultados.map((item, index) => (
              <div key={item.id_temp} className={`holerite-card-preview ${item.status}`}>
                <div className="card-top">
                  <span className="page-badge">Página {item.numero_pagina}</span>
                  {/* Link para abrir o blob em nova aba para conferência */}
                  <a href={item.previewUrl} target="_blank" rel="noreferrer" className="btn-view" title="Visualizar Página">
                    <span className="material-symbols-outlined">visibility</span>
                  </a>
                </div>
                
                <div className="card-content">
                  <label>Colaborador Identificado:</label>
                  <select 
                    value={item.funcionario?.id || ''} 
                    onChange={(e) => handleFuncionarioChange(index, e.target.value)}
                    className={!item.funcionario ? 'select-warning' : ''}
                  >
                    <option value="">-- Selecione Manualmente --</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nome_completo}</option>
                    ))}
                  </select>

                  <div className="competencia-info">
                    <small>Competência:</small>
                    <strong>{item.competencia}</strong>
                  </div>
                </div>

                {item.status === 'success' ? (
                  <div className="status-bar success">
                    <span className="material-symbols-outlined icon-tiny">check_circle</span> Pronto
                  </div>
                ) : (
                  <div className="status-bar warning">
                    <span className="material-symbols-outlined icon-tiny">warning</span> Verifique
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROGRESSO DE UPLOAD */}
      {uploading && (
        <div className="upload-progress-container">
          <div className="progress-box">
            <h3>Enviando Holerites para Documentos...</h3>
            <progress value={progresso.atual} max={progresso.total}></progress>
            <p>{progresso.atual} de {progresso.total} arquivos processados</p>
          </div>
        </div>
      )}
    </div>
  );
}