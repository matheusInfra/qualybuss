import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

// Services existentes (Mantidos para o PDF funcionar)
import { getFuncionarios } from '../services/funcionarioService';
import { processarPDFHolerites } from '../utils/PDFProcessor'; //
import { uploadDocumento, createDocumentoRegistro } from '../services/documentoService'; //

// Novos Componentes (Criados na etapa anterior)
import ImportadorFuncionarios from '../components/Importacao/ImportadorFuncionarios';
import ConfiguradorIA from '../components/Importacao/ConfiguradorIA';

import './ImportadorPage.css'; //

function ImportadorPage() {
  // Controle de Abas
  const [activeTab, setActiveTab] = useState('documentos');

  // =================================================================================
  // LÓGICA ORIGINAL: IMPORTAÇÃO DE DOCUMENTOS (PDF)
  // Mantida intacta, apenas encapsulada para rodar dentro da aba 'documentos'
  // =================================================================================
  const [status, setStatus] = useState('idle'); // idle, processing, review, uploading, success
  const [itensImportacao, setItensImportacao] = useState([]);
  const [progressoUpload, setProgressoUpload] = useState(0);

  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // 1. Upload do PDF Mestre
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor, selecione um arquivo PDF.");
      return;
    }

    setStatus('processing');
    try {
      const resultados = await processarPDFHolerites(file, funcionarios || []);
      setItensImportacao(resultados);
      setStatus('review');
      toast.success(`${resultados.length} páginas processadas!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao ler PDF: " + error.message);
      setStatus('idle');
    }
  };

  // 2. Correção Manual de Vínculo
  const handleAssociarManual = (idItem, idFuncionario) => {
    const funcSelecionado = funcionarios.find(f => f.id === idFuncionario);
    
    setItensImportacao(prev => prev.map(item => {
      if (item.id_temp === idItem) {
        return { 
          ...item, 
          funcionario: funcSelecionado, 
          status: 'success' 
        };
      }
      return item;
    }));
  };

  // 3. Salvar Tudo
  const handleSalvarTudo = async () => {
    const paraSalvar = itensImportacao.filter(i => i.funcionario && i.status === 'success');
    
    if (paraSalvar.length === 0) {
      toast.error("Nenhum item válido para importar.");
      return;
    }

    setStatus('uploading');
    let contador = 0;

    for (const item of paraSalvar) {
      try {
        const file = new File([item.arquivo], `Holerite_${item.competencia.replace(' ','_')}.pdf`, { type: 'application/pdf' });
        
        const path = await uploadDocumento(file, item.funcionario.id);

        await createDocumentoRegistro({
          funcionario_id: item.funcionario.id,
          nome_arquivo: `Holerite - ${item.competencia}`,
          categoria: 'Folha e Ponto',
          path_storage: path,
          data_documento: new Date().toISOString()
        });

        contador++;
        setProgressoUpload(Math.round((contador / paraSalvar.length) * 100));

      } catch (err) {
        console.error("Falha ao salvar item:", item, err);
        toast.error(`Falha ao salvar item de ${item.funcionario?.nome_completo}`);
      }
    }

    setStatus('success');
  };

  // --- Renderização da Aba de Documentos (Interface Original) ---
  const renderTabDocumentos = () => {
    if (status === 'idle') {
      return (
        <div className="dropzone-area fade-in">
          <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileUpload} />
          <label htmlFor="pdf-upload" className="upload-label">
            <span className="material-symbols-outlined icon-upload">upload_file</span>
            <span className="upload-text">Clique para selecionar o PDF Mestre</span>
            <span className="upload-subtext">O sistema irá separar as páginas automaticamente por colaborador.</span>
          </label>
        </div>
      );
    }

    if (status === 'processing') {
      return <div className="loading-container"><h3>Processando inteligência de documentos... 🤖</h3></div>;
    }

    if (status === 'review') {
      return (
        <div className="importador-review fade-in">
          <div className="review-header">
            <div>
              <h2>Revisão da Importação</h2>
              <p style={{color: '#64748b', margin: 0}}>{itensImportacao.length} páginas detectadas</p>
            </div>
            <div className="review-actions">
              <button className="btn-secondary" onClick={() => setStatus('idle')}>Cancelar</button>
              <button className="btn-primary" onClick={handleSalvarTudo}>
                Confirmar Importação ({itensImportacao.filter(i => i.status==='success').length})
              </button>
            </div>
          </div>

          <div className="review-grid">
            {itensImportacao.map(item => (
              <div key={item.id_temp} className={`review-card ${item.status}`}>
                <div className="card-top">
                  <span className="page-badge">Pág {item.numero_pagina}</span>
                  <span className="competencia-badge">{item.competencia}</span>
                </div>
                
                <div className="card-preview">
                  <iframe src={item.previewUrl} title="Preview" width="100%" height="100%" />
                </div>

                <div className="card-controls">
                  {item.status === 'warning' ? (
                    <div className="status-box warning">⚠️ Não identificado</div>
                  ) : (
                    <div className="status-box success">✅ {item.funcionario.nome_completo}</div>
                  )}
                  
                  <select 
                    className="card-select"
                    value={item.funcionario?.id || ''} 
                    onChange={(e) => handleAssociarManual(item.id_temp, e.target.value)}
                  >
                    <option value="">-- Vincular Manualmente --</option>
                    {funcionarios?.map(f => (
                      <option key={f.id} value={f.id}>{f.nome_completo}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (status === 'uploading') {
      return (
        <div className="loading-container">
          <h3>Enviando arquivos para a nuvem... {progressoUpload}%</h3>
          <div className="progress-bar-wrapper">
             <div className="progress-fill" style={{width: `${progressoUpload}%`}}></div>
          </div>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="success-container">
          <span className="material-symbols-outlined success-icon">check_circle</span>
          <h2>Importação Concluída!</h2>
          <p>Os holerites foram distribuídos com sucesso nas pastas dos colaboradores.</p>
          <button className="btn-primary" onClick={() => { setStatus('idle'); setItensImportacao([]); }}>
            Nova Importação
          </button>
        </div>
      );
    }
  };

  // =================================================================================
  // RENDERIZAÇÃO PRINCIPAL (LAYOUT COM ABAS)
  // =================================================================================
  return (
    <div className="importador-page-wrapper">
      <div className="importador-header">
        <h1>Central de Dados e Inteligência</h1>
        <p>Gerencie importações em massa, documentos e o cérebro da IA.</p>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'documentos' ? 'active' : ''}`}
          onClick={() => setActiveTab('documentos')}
        >
          <span className="material-symbols-outlined">folder_open</span>
          Documentos & Holerites
        </button>
        <button 
          className={`tab-btn ${activeTab === 'csv' ? 'active' : ''}`}
          onClick={() => setActiveTab('csv')}
        >
          <span className="material-symbols-outlined">group_add</span>
          Importar Funcionários (CSV)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ia' ? 'active' : ''}`}
          onClick={() => setActiveTab('ia')}
        >
          <span className="material-symbols-outlined">psychology</span>
          Configuração da IA
        </button>
      </div>

      <div className="tab-content-area">
        {activeTab === 'documentos' && (
          <div className="tab-pane">
            <div className="tab-info-header">
              <span className="material-symbols-outlined">description</span>
              <div>
                <h4>Processador de Documentos</h4>
                <small>Faça upload de PDFs com múltiplos holerites ou pontos e o sistema separará automaticamente.</small>
              </div>
            </div>
            {/* Renderiza a lógica antiga de PDF aqui dentro */}
            {renderTabDocumentos()}
          </div>
        )}

        {activeTab === 'csv' && (
          <div className="tab-pane fade-in">
            {/* Novo Componente de CSV */}
            <ImportadorFuncionarios />
          </div>
        )}

        {activeTab === 'ia' && (
          <div className="tab-pane fade-in">
            {/* Novo Componente de IA */}
            <ConfiguradorIA />
          </div>
        )}
      </div>
    </div>
  );
}

export default ImportadorPage;