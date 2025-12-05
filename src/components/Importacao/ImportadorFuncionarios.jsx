import React, { useState } from 'react';
import useSWR from 'swr';
import { parseAndValidateCSV, downloadModeloCSV } from '../../services/importacaoService';
import { createFuncionario } from '../../services/funcionarioService';
import { getEmpresas } from '../../services/empresaService';
import { toast } from 'react-hot-toast';
import './ImportadorFuncionarios.css';

export default function ImportadorFuncionarios() {
  const [data, setData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Seleção de Empresa Padrão para a Importação
  const [empresaDestino, setEmpresaDestino] = useState('');
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Segurança: Valida extensão
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Por favor, envie um arquivo .csv");
      e.target.value = '';
      return;
    }

    try {
      setValidationErrors([]);
      setData([]);
      
      const { data: validData, errors } = await parseAndValidateCSV(file);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error(`Arquivo contém ${errors.length} erros. Verifique a lista.`);
      } else {
        setData(validData);
        toast.success(`${validData.length} colaboradores validados!`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar CSV: " + error.message);
    }
  };

  const handleProcessar = async () => {
    if (!empresaDestino) {
      toast.error("Selecione a empresa de destino antes de importar.");
      return;
    }

    if (validationErrors.length > 0) {
      toast.error("Corrija os erros listados antes de prosseguir.");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja importar ${data.length} novos colaboradores?`)) return;
    
    setImporting(true);
    let successCount = 0;
    let errorsCount = 0;

    for (let i = 0; i < data.length; i++) {
      try {
        const func = data[i];
        
        // Monta payload compatível com a tabela 'funcionarios'
        // Limpa caracteres especiais de CPF/Telefone para evitar erros de formato
        const payload = {
          nome_completo: func.nome_completo,
          cpf: func.cpf ? func.cpf.replace(/\D/g, '') : null,
          rg: func.rg,
          data_nascimento: func.data_nascimento,
          
          email_corporativo: func.email_corporativo,
          email: func.email_corporativo, // Replica para o campo de sistema
          telefone_celular: func.telefone_celular,
          
          cargo: func.cargo,
          departamento: func.departamento || 'Geral',
          salario_bruto: parseFloat(func.salario_bruto),
          data_admissao: func.data_admissao,
          
          // Endereço (Novos campos mapeados)
          endereco_cep: func.endereco_cep ? func.endereco_cep.replace(/\D/g, '') : null,
          endereco_rua: func.endereco_rua,
          endereco_numero: func.endereco_numero,
          endereco_bairro: func.endereco_bairro,
          endereco_cidade: func.endereco_cidade,
          endereco_estado: func.endereco_estado,

          status: 'Ativo',
          tipo_contrato: 'CLT', // Padrão, pode vir do CSV se adicionar a coluna
          empresa_id: empresaDestino
        };

        await createFuncionario(payload);
        successCount++;
      } catch (err) {
        console.error(`Erro na linha ${i+1}:`, err);
        errorsCount++;
      }
      
      // Atualiza barra de progresso
      setProgress(Math.round(((i + 1) / data.length) * 100));
    }

    setImporting(false);
    
    if (errorsCount === 0) {
      toast.success("Importação concluída com sucesso total!");
      setData([]); // Limpa a tela
    } else {
      toast.error(`Processo finalizado com ${errorsCount} falhas. Verifique o console.`);
    }
  };

  return (
    <div className="csv-importer">
      <div className="csv-header-box">
        <div className="csv-instructions">
          <h4><span className="material-symbols-outlined">upload_file</span> Importação em Massa</h4>
          <p>
            Baixe o modelo obrigatório, preencha os dados e faça o upload. 
            O sistema validará CPFs e formatos antes de salvar.
          </p>
          
          <button className="btn-download-model" onClick={downloadModeloCSV}>
            <span className="material-symbols-outlined">download</span> 
            Baixar Planilha Modelo (.csv)
          </button>
        </div>

        <div className="upload-section">
          {/* Seleção de Empresa */}
          <div className="empresa-select-box">
            <label>Empresa de Destino *</label>
            <select 
              value={empresaDestino} 
              onChange={(e) => setEmpresaDestino(e.target.value)}
              disabled={importing}
            >
              <option value="">Selecione...</option>
              {empresas?.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome_fantasia || emp.razao_social}</option>
              ))}
            </select>
          </div>

          <label className={`upload-btn-label ${importing ? 'disabled' : ''}`}>
            {importing ? 'Processando...' : 'Selecionar Arquivo CSV Preenchido'}
            <input type="file" accept=".csv" onChange={handleFileUpload} disabled={importing} />
          </label>
        </div>
      </div>

      {/* PAINEL DE ERROS (Se houver) */}
      {validationErrors.length > 0 && (
        <div className="error-report fade-in">
          <div className="error-header">
            <span className="material-symbols-outlined">error</span>
            <h4>O arquivo contém erros que impedem a importação ({validationErrors.length})</h4>
          </div>
          <ul className="error-list">
            {validationErrors.slice(0, 10).map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
            {validationErrors.length > 10 && <li>... e mais {validationErrors.length - 10} erros.</li>}
          </ul>
          <p className="fix-hint">Por favor, corrija o arquivo e tente novamente.</p>
        </div>
      )}

      {/* PAINEL DE SUCESSO / PREVIEW */}
      {data.length > 0 && validationErrors.length === 0 && (
        <div className="csv-preview fade-in">
          <div className="preview-header">
            <div className="preview-title">
              <span className="material-symbols-outlined success-icon">check_circle</span>
              <div>
                <h4>Pré-visualização de Dados</h4>
                <small>{data.length} colaboradores prontos para importar.</small>
              </div>
            </div>
            
            <div className="csv-actions">
              {importing ? (
                <div className="progress-container">
                  <span className="progress-text">Importando... {progress}%</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{width: `${progress}%`}}></div>
                  </div>
                </div>
              ) : (
                <button className="btn-confirmar-importacao" onClick={handleProcessar}>
                  Confirmar e Importar
                </button>
              )}
            </div>
          </div>
          
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Cargo</th>
                  <th>Salário</th>
                  <th>Admissão</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 8).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.nome_completo}</td>
                    <td>{row.cpf}</td>
                    <td>{row.cargo}</td>
                    <td>R$ {row.salario_bruto}</td>
                    <td>{row.data_admissao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 8 && (
              <div className="more-rows-badge">
                + {data.length - 8} outros registros ocultos
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}