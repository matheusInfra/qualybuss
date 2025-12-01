// src/pages/ImportadorPage.jsx
import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionarios } from '../services/funcionarioService';
import { processarPDFHolerites } from '../utils/PDFProcessor';
import { uploadDocumento, createDocumentoRegistro } from '../services/documentoService';
import './ImportadorPage.css'; // Vamos criar um CSS básico depois

function ImportadorPage() {
  // Estados da Máquina: 'idle', 'processing', 'review', 'uploading', 'success'
  const [status, setStatus] = useState('idle');
  const [itensImportacao, setItensImportacao] = useState([]);
  const [progressoUpload, setProgressoUpload] = useState(0);

  // Busca lista de funcionários para o "Match"
  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // 1. AÇÃO: USUÁRIO SOLTA O ARQUIVO
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Por favor, selecione um arquivo PDF.");
      return;
    }

    setStatus('processing');
    try {
      // Chama o Motor de Leitura
      const resultados = await processarPDFHolerites(file, funcionarios || []);
      setItensImportacao(resultados);
      setStatus('review'); // Vai para a tela de "Limbo"
      toast.success(`${resultados.length} páginas processadas!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao ler PDF: " + error.message);
      setStatus('idle');
    }
  };

  // 2. AÇÃO: USUÁRIO CORRIGE UM VÍNCULO MANUALMENTE
  const handleAssociarManual = (idItem, idFuncionario) => {
    const funcSelecionado = funcionarios.find(f => f.id === idFuncionario);
    
    setItensImportacao(prev => prev.map(item => {
      if (item.id_temp === idItem) {
        return { 
          ...item, 
          funcionario: funcSelecionado, 
          status: 'success' // Vira verde
        };
      }
      return item;
    }));
  };

  // 3. AÇÃO: CONFIRMAR E SALVAR TUDO
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
        // Converte Blob para File
        const file = new File([item.arquivo], `Holerite_${item.competencia.replace(' ','_')}.pdf`, { type: 'application/pdf' });
        
        // A. Upload Físico (Reutiliza seu serviço existente)
        const path = await uploadDocumento(file, item.funcionario.id);

        // B. Registro no Banco
        await createDocumentoRegistro({
          funcionario_id: item.funcionario.id,
          nome_arquivo: `Holerite - ${item.competencia}`,
          categoria: 'Folha e Ponto', // Categoria fixa
          path_storage: path,
          data_documento: new Date().toISOString() // Poderíamos parsear a data da competência aqui
        });

        contador++;
        setProgressoUpload(Math.round((contador / paraSalvar.length) * 100));

      } catch (err) {
        console.error("Falha ao salvar item:", item, err);
        // Não paramos o loop, apenas logamos o erro (poderíamos marcar no item visualmente)
      }
    }

    setStatus('success');
  };

  // --- RENDERIZAÇÃO ---

  if (status === 'idle') {
    return (
      <div className="importador-container">
        <h1>Importação em Massa de Holerites</h1>
        <p>Arraste o PDF da contabilidade contendo múltiplos holerites.</p>
        
        <div className="dropzone-area">
          <input type="file" id="pdf-upload" accept=".pdf" onChange={handleFileUpload} />
          <label htmlFor="pdf-upload" className="upload-label">
            <span className="material-symbols-outlined">upload_file</span>
            <span>Clique para selecionar o PDF Mestre</span>
          </label>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    return <div className="loading-container">Lendo e separando páginas... 🤖</div>;
  }

  if (status === 'review') {
    return (
      <div className="importador-review">
        <div className="review-header">
          <h2>Revisão da Importação ({itensImportacao.length} páginas)</h2>
          <div className="review-actions">
            <button className="btn-secondary" onClick={() => setStatus('idle')}>Cancelar</button>
            <button className="btn-primary" onClick={handleSalvarTudo}>
              Confirmar e Importar ({itensImportacao.filter(i => i.status==='success').length})
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
                {/* Mostra um iframe ou embed do PDF cortado */}
                <iframe src={item.previewUrl} title="Preview" width="100%" height="200px" />
              </div>

              <div className="card-controls">
                {item.status === 'warning' ? (
                  <div className="alert-box">⚠️ Não identificado</div>
                ) : (
                  <div className="success-box">✅ {item.funcionario.nome_completo}</div>
                )}
                
                <select 
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
        <h3>Enviando arquivos... {progressoUpload}%</h3>
        <progress value={progressoUpload} max="100"></progress>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="success-container">
        <span className="material-symbols-outlined big-icon">check_circle</span>
        <h2>Importação Concluída!</h2>
        <p>Os holerites foram distribuídos nas pastas dos colaboradores.</p>
        <button className="btn-primary" onClick={() => { setStatus('idle'); setItensImportacao([]); }}>
          Nova Importação
        </button>
      </div>
    );
  }
}

export default ImportadorPage;