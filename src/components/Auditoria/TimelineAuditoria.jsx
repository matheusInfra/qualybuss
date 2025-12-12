import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import './TimelineAuditoria.css';

const formatDate = (dateStr) => new Date(dateStr).toLocaleString('pt-BR');

const labels = {
  nome_completo: 'Nome',
  cpf: 'CPF',
  salario_bruto: 'Salário',
  banco_conta_numero: 'Conta',
  cargo: 'Cargo',
  departamento: 'Depto',
  status: 'Status',
  data_nascimento: 'Nascimento'
};

export default function TimelineAuditoria({ registroId, tabela, global = false }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase
        .from('logs_auditoria')
        .select('*')
        .order('data_alteracao', { ascending: false })
        .limit(50); // BLINDAGEM DE ESCALABILIDADE

      // Se NÃO for global, filtra pelo registro específico
      if (!global && registroId) {
        query = query.eq('registro_id', registroId);
        if (tabela) query = query.eq('tabela', tabela);
      } else if (!global && !registroId) {
        // Se não é global e não tem ID, não busca nada (proteção)
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      if (!error) setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();
  }, [registroId, tabela, global]);

  if (loading) return <div className="p-4 text-center text-gray-500">Carregando trilha...</div>;

  if (logs.length === 0) {
    return <div className="p-4 text-center text-gray-400 italic">Nenhum registro de alteração encontrado.</div>;
  }

  return (
    <div className="timeline-container">
      <h4>
        {global ? '🛡️ Monitoramento Global (Últimas 50 Ações)' : '🛡️ Trilha de Alterações'}
      </h4>
      <div className="timeline-list">
        {logs.map((log) => (
          <div key={log.id} className="timeline-item">
            <div className={`timeline-marker ${(log.tipo_acao || log.tipo_operacao) === 'DELETE' ? 'danger' : ''}`}></div>
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="date">{formatDate(log.data_alteracao)}</span>
                {global && <span className="badge-audit">{log.tabela || log.tabela_afetada} #{log.registro_id}</span>}
              </div>

              <div className="changes-box">
                {log.colunas_alteradas && log.colunas_alteradas.length > 0 ? (
                  log.colunas_alteradas.map(col => {
                    if (['updated_at', 'id'].includes(col)) return null;
                    return (
                      <div key={col} className="change-row">
                        <span className="field-name">{labels[col] || col}:</span>
                        <span className="old-val" title={log.dados_antigos[col]}>
                          {String(log.dados_antigos[col] || 'Vazio').substring(0, 20)}
                        </span>
                        <span className="arrow">➝</span>
                        <span className="new-val" title={log.dados_novos[col]}>
                          {String(log.dados_novos[col] || 'Vazio').substring(0, 20)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-gray-500 text-sm">
                    {(log.tipo_acao || log.tipo_operacao) === 'INSERT' ? 'Registro criado.' : 'Ação registrada sem detalhes de campo.'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}