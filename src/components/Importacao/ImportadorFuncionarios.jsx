import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
// [IMPORTANTE] Necessário para checar duplicidade direto no banco
import { supabase } from '../../services/supabaseClient'; 
import { parseAndValidateCSV, downloadModeloCSV } from '../../services/importacaoService';
import { createFuncionario } from '../../services/funcionarioService';
import { getEmpresas } from '../../services/empresaService';
import './ImportadorFuncionarios.css';

export default function ImportadorFuncionarios({ onSuccess }) {
  const [data, setData] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [duplicados, setDuplicados] = useState([]); // Lista de CPFs já existentes no banco
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Seleção de Empresa Padrão para a Importação
  const [empresaDestino, setEmpresaDestino] = useState('');
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);

  // --- LÓGICA DE SEGURANÇA ---
  // Verifica no banco se os CPFs do arquivo já estão cadastrados
  const verificarDuplicidadeBanco = async (listaFuncionarios) => {
    if (listaFuncionarios.length === 0) return;

    // Extrai apenas os CPFs para consulta
    const listaCpfs = listaFuncionarios.map(f => f.cpf).filter(Boolean);
    
    try {
      // Busca no Supabase quem já tem esses CPFs
      const { data: existentes, error } = await supabase
        .from('funcionarios')
        .select('cpf')
        .in('cpf', listaCpfs);

      if (error) throw error;

      if (existentes && existentes.length > 0) {
        const cpfsExistentes = existentes.map(e => e.cpf);
        setDuplicados(cpfsExistentes);
        toast(`${existentes.length} colaboradores já existem no banco e serão ignorados.`, { icon: '⚠️' });
      } else {
        setDuplicados([]);
      }
    } catch (err) {
      console.error("Erro ao verificar duplicidade:", err);
      // Não bloqueia o fluxo, mas avisa
      toast.error("Não foi possível verificar duplicidade no servidor.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error("Por favor, envie um arquivo .csv");
      e.target.value = '';
      return;
    }

    try {
      setValidationErrors([]);
      setDuplicados([]);
      setData([]);
      
      const { data: validData, errors } = await parseAndValidateCSV(file);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        toast.error(`Arquivo contém ${errors.length} erros de validação.`);
      } else {
        setData(validData);
        // Assim que valida o formato, verifica a existência no banco
        await verificarDuplicidadeBanco(validData);
        
        if (validData.length > 0 && errors.length === 0) {
           toast.success(`${validData.length} linhas lidas com sucesso!`);
        }
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

    // Filtra removendo os duplicados
    const paraImportar = data.filter(d => !duplicados.includes(d.cpf));

    if (paraImportar.length === 0) {
      toast.error("Todos os colaboradores deste arquivo já estão cadastrados.");
      return;
    }

    const msgConfirmacao = duplicados.length > 0
      ? `Detectamos ${duplicados.length} duplicatas que serão ignoradas.\n\nDeseja importar os ${paraImportar.length} novos colaboradores restantes?`
      : `Tem certeza que deseja importar ${paraImportar.length} novos colaboradores?`;

    if (!window.confirm(msgConfirmacao)) return;
    
    setImporting(true);
    let successCount = 0;
    let errorsCount = 0;

    for (let i = 0; i < paraImportar.length; i++) {
      try {
        const func = paraImportar[i];
        
        const payload = {
          nome_completo: func.nome_completo,
          cpf: func.cpf, // Já vem limpo do service
          rg: func.rg,
          data_nascimento: func.data_nascimento,
          
          email_corporativo: func.email_corporativo,
          email: func.email_corporativo,
          telefone_celular: func.telefone_celular,
          
          cargo: func.cargo,
          departamento: func.departamento || 'Geral',
          salario_bruto: func.salario_bruto ? parseFloat(func.salario_bruto) : 0,
          data_admissao: func.data_admissao,
          
          // Endereço
          endereco_cep: func.endereco_cep ? func.endereco_cep.replace(/\D/g, '') : null,
          endereco_rua: func.endereco_rua,
          endereco_numero: func.endereco_numero,
          endereco_bairro: func.endereco_bairro,
          endereco_cidade: func.endereco_cidade,
          endereco_estado: func.endereco_estado,

          status: 'Ativo',
          tipo_contrato: 'CLT',
          empresa_id: empresaDestino
        };

        await createFuncionario(payload);
        successCount++;
      } catch (err) {
        console.error(`Erro ao importar ${paraImportar[i].nome_completo}:`, err);
        errorsCount++;
      }
      
      // Atualiza barra de progresso
      setProgress(Math.round(((i + 1) / paraImportar.length) * 100));
    }

    setImporting(false);
    
    if (errorsCount === 0) {
      toast.success("Importação concluída com sucesso total!");
      setData([]); 
      setDuplicados([]);
      if (onSuccess) onSuccess();
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
            O sistema validará CPFs duplicados e formatos antes de salvar.
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

      {/* PAINEL DE ERROS DE VALIDAÇÃO (FORMATO) */}
      {validationErrors.length > 0 && (
        <div className="error-report fade-in">
          <div className="error-header">
            <span className="material-symbols-outlined">error</span>
            <h4>O arquivo contém erros de formato ({validationErrors.length})</h4>
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

      {/* PAINEL DE PREVIEW / SUCESSO */}
      {data.length > 0 && validationErrors.length === 0 && (
        <div className="csv-preview fade-in">
          <div className="preview-header">
            <div className="preview-title">
              <span className="material-symbols-outlined success-icon">check_circle</span>
              <div>
                <h4>Pré-visualização de Dados</h4>
                <small>{data.length} registros lidos do arquivo.</small>
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
                <button 
                  className="btn-confirmar-importacao" 
                  onClick={handleProcessar}
                  // Desabilita se todos forem duplicados
                  disabled={data.length === duplicados.length}
                >
                  {duplicados.length > 0 
                    ? `Importar Apenas Novos (${data.length - duplicados.length})` 
                    : 'Confirmar e Importar'
                  }
                </button>
              )}
            </div>
          </div>
          
          {/* AVISO DE DUPLICIDADE */}
          {duplicados.length > 0 && (
            <div className="warning-box" style={{
              margin: '0 20px 15px 20px', 
              padding: '12px', 
              background: '#fff3cd', 
              borderRadius: '6px', 
              color: '#856404',
              border: '1px solid #ffeeba',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="material-symbols-outlined">warning</span>
              <span>
                <strong>{duplicados.length}</strong> colaboradores já existem no sistema (CPF igual) e serão <strong>ignorados</strong> na importação.
              </span>
            </div>
          )}
          
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Cargo</th>
                  <th>Salário</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 8).map((row, idx) => {
                  const isDuplicated = duplicados.includes(row.cpf);
                  return (
                    <tr 
                      key={idx} 
                      style={{
                        opacity: isDuplicated ? 0.6 : 1, 
                        backgroundColor: isDuplicated ? '#f8f9fa' : 'transparent',
                        textDecoration: isDuplicated ? 'none' : 'none'
                      }}
                    >
                      <td>
                        {isDuplicated ? (
                          <span style={{color: '#d97706', fontWeight: 'bold', fontSize: '0.85rem'}}>⚠️ Existente</span>
                        ) : (
                          <span style={{color: '#16a34a', fontWeight: 'bold', fontSize: '0.85rem'}}>✅ Novo</span>
                        )}
                      </td>
                      <td>{row.nome_completo}</td>
                      <td>{row.cpf}</td>
                      <td>{row.cargo}</td>
                      <td>R$ {row.salario_bruto}</td>
                    </tr>
                  );
                })}
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