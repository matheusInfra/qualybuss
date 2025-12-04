import React, { useState } from 'react';
import { parseCSV } from '../../services/importacaoService';
import { createFuncionario } from '../../services/funcionarioService';
import { toast } from 'react-hot-toast';
import './ImportadorFuncionarios.css'; // CSS simples abaixo

export default function ImportadorFuncionarios() {
  const [data, setData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const parsedData = await parseCSV(file);
      setData(parsedData);
      toast.success(`${parsedData.length} registros lidos! Verifique antes de importar.`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleProcessar = async () => {
    if (!window.confirm(`Confirma a importação de ${data.length} colaboradores?`)) return;
    
    setImporting(true);
    let successCount = 0;
    let errorsCount = 0;

    for (let i = 0; i < data.length; i++) {
      try {
        const func = data[i];
        // Tratamento básico de dados
        const payload = {
          nome_completo: func.nome_completo,
          cpf: func.cpf?.replace(/\D/g, ''), // Limpa CPF
          email_corporativo: func.email_corporativo,
          cargo: func.cargo || 'Não informado',
          salario_bruto: parseFloat(func.salario_bruto || 0),
          data_admissao: func.data_admissao || new Date().toISOString().split('T')[0],
          status: 'Ativo',
          // Campos obrigatórios técnicos (pode pegar de um select na tela depois)
          empresa_id: 'ID_DA_SUA_EMPRESA_PADRAO' // Idealmente o usuário seleciona antes
        };

        // Chama o service existente (que já criamos em passos anteriores)
        await createFuncionario(payload);
        successCount++;
      } catch (err) {
        console.error("Erro linha " + i, err);
        errorsCount++;
      }
      // Atualiza barra de progresso
      setProgress(Math.round(((i + 1) / data.length) * 100));
    }

    setImporting(false);
    toast.success(`Importação finalizada! Sucessos: ${successCount} | Erros: ${errorsCount}`);
    if (successCount > 0) setData([]); // Limpa se deu certo
  };

  return (
    <div className="csv-importer">
      <div className="csv-header">
        <p>Importe listas de funcionários via CSV. O arquivo deve ter cabeçalhos como: <code>nome_completo, cpf, email_corporativo, cargo, salario_bruto</code>.</p>
        <input type="file" accept=".csv" onChange={handleFileUpload} disabled={importing} />
      </div>

      {data.length > 0 && (
        <div className="csv-preview">
          <h4>Pré-visualização ({data.length})</h4>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  {Object.keys(data[0]).map(k => <th key={k}>{k}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((v, i) => <td key={i}>{v}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 10 && <p className="more-rows">... e mais {data.length - 10} linhas.</p>}
          </div>
          
          <div className="csv-actions">
            {importing ? (
              <div className="progress-bar">
                <div className="fill" style={{width: `${progress}%`}}></div>
                <span>{progress}%</span>
              </div>
            ) : (
              <button className="btn-primary" onClick={handleProcessar}>
                Processar Importação
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}