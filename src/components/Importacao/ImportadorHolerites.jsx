import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { processarPDFHolerites } from '../../utils/PDFProcessor';
import { getFuncionariosDropdown } from '../../services/funcionarioService';
import { uploadDocumento, createDocumentoRegistro } from '../../services/documentoService';
import './ImportadorHolerites.css'; // Criaremos o CSS abaixo

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
      // Chama o utilitário que você já tem
      const paginasProcessadas = await processarPDFHolerites(selectedFile, funcionarios);
      setResultados(paginasProcessadas);
      toast.success(`${paginasProcessadas.length} páginas processadas.`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar PDF: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Permite corrigir o funcionário manualmente se o sistema errou
  const handleFuncionarioChange = (index, funcionarioId) => {
    const novosResultados = [...resultados];
    const funcEncontrado = funcionarios.find(f => f.id === funcionarioId);
    
    novosResultados[index].funcionario = funcEncontrado;
    novosResultados[index].status = funcEncontrado ? 'success' : 'warning';
    
    setResultados(novosResultados);
  };

  // 4. Envia para o Módulo de Documentos
  const handleFinalizarImportacao = async () => {
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
        // Usa o Blob gerado no processamento, mas precisamos convertê-lo em File para o upload
        const arquivoParaUpload = new File(
          [item.arquivo], 
          `Holerite_${item.competencia.replace('/', '-')}.pdf`, 
          { type: 'application/pdf' }
        );

        const pathStorage = await uploadDocumento(arquivoParaUpload, item.funcionario.id);

        // B. Criação do Registro no Banco (Tabela Documentos)
        await createDocumentoRegistro({
          funcionario_id: item.funcionario.id,
          nome: `Holerite - ${item.competencia}`,
          categoria: 'Holerite',
          data_documento: new Date().toISOString().split('T')[0], // Hoje
          arquivo_url: pathStorage,
          tipo_arquivo: 'application/pdf',
          tamanho: item.arquivo.size,
          descricao: `Importado via Importador em ${new Date().toLocaleDateString()}`
        });

        sucessos++;
      } catch (error) {
        console.error(`Erro ao salvar holerite pág ${item.numero_pagina}:`, error);
        erros++;
      }

      setProgresso(prev => ({ ...prev, atual: prev.atual + 1 }));
    }

    setUploading(false);
    toast.success(`Importação concluída! ${sucessos} salvos, ${erros} erros.`);
    
    if (onSuccess) onSuccess();
    
    // Limpa a tela após sucesso parcial ou total
    if (sucessos > 0) {
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
            <span className="material-symbols-outlined icon-xl">upload_file</span>
            <h3>Clique para selecionar o PDF Único</h3>
            <p>O sistema irá separar as páginas e identificar os colaboradores automaticamente.</p>
          </label>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Lendo e separando páginas do PDF...</p>
        </div>
      )}

      {/* LISTA DE RESULTADOS (PREVIEW) */}
      {resultados.length > 0 && !uploading && (
        <div className="preview-area">
          <div className="preview-header">
            <h3>Resultado da Análise ({resultados.length} págs)</h3>
            <div className="actions">
              <button className="btn-secondary" onClick={() => {setFile(null); setResultados([])}}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleFinalizarImportacao}>
                <span className="material-symbols-outlined">save</span>
                Enviar para Documentos
              </button>
            </div>
          </div>

          <div className="grid-holerites">
            {resultados.map((item, index) => (
              <div key={item.id_temp} className={`holerite-card-preview ${item.status}`}>
                <div className="card-top">
                  <span className="page-badge">Pág {item.numero_pagina}</span>
                  <a href={item.previewUrl} target="_blank" rel="noreferrer" className="btn-view">
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
                    <option value="">-- Não Identificado --</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nome_completo}</option>
                    ))}
                  </select>

                  <div className="competencia-info">
                    <small>Competência Detectada:</small>
                    <strong>{item.competencia}</strong>
                  </div>
                </div>

                {item.status === 'success' ? (
                  <div className="status-bar success">Pronto para importar</div>
                ) : (
                  <div className="status-bar warning">Verifique o colaborador</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PROGRESSO DE UPLOAD */}
      {uploading && (
        <div className="upload-progress">
          <h3>Enviando Holerites...</h3>
          <progress value={progresso.atual} max={progresso.total}></progress>
          <p>{progresso.atual} de {progresso.total} arquivos processados</p>
        </div>
      )}
    </div>
  );
}