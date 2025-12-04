import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import './TimelineAuditoria.css';

// Formata data amigável
const formatDate = (dateStr) => new Date(dateStr).toLocaleString('pt-BR');

// Dicionário para nomes bonitos das colunas
const labels = {
  nome_completo: 'Nome',
  cpf: 'CPF',
  salario_bruto: 'Salário',
  banco_conta_numero: 'Conta Bancária',
  cargo: 'Cargo',
  departamento: 'Departamento',
  status: 'Status'
};

export default function TimelineAuditoria({ registroId, tabela = 'funcionarios' }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      // Busca logs e tenta dar join com o usuário responsável (se tiver tabela de profiles/users acessível)
      // Como auth.users é protegido, pegamos o email do log se salvarmos, ou apenas mostramos o ID por enquanto
      const { data, error } = await supabase
        .from('logs_auditoria')
        .select('*')
        .eq('tabela_afetada', tabela)
        .eq('registro_id', registroId)
        .order('data_alteracao', { ascending: false });

      if (!error) setLogs(data);
      setLoading(false);
    };

    if (registroId) fetchLogs();
  }, [registroId, tabela]);

  if (loading) return <p>Carregando auditoria...</p>;
  if (logs.length === 0) return null; // Não mostra nada se não tiver histórico

  return (
    <div className="timeline-container">
      <h4>🛡️ Trilha de Auditoria (Alterações Cadastrais)</h4>
      <div className="timeline-list">
        {logs.map((log) => (
          <div key={log.id} className="timeline-item">
            <div className="timeline-marker"></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="date">{formatDate(log.data_alteracao)}</span>
                <span className="user-badge">
                   {/* Aqui idealmente buscariamos o nome do usuário */}
                   Usuário do Sistema
                </span>
              </div>
              
              <div className="changes-box">
                {log.colunas_alteradas && log.colunas_alteradas.map(col => {
                  // Filtra colunas técnicas que não interessam
                  if (['updated_at', 'id'].includes(col)) return null;
                  
                  return (
                    <div key={col} className="change-row">
                      <span className="field-name">{labels[col] || col}:</span>
                      <span className="old-val">{String(log.dados_antigos[col] || 'Vazio')}</span>
                      <span className="arrow">➝</span>
                      <span className="new-val">{String(log.dados_novos[col] || 'Vazio')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}