import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import './TimelineAuditoria.css';

// Formata data amigável (ex: 04/12/2025 às 14:30)
const formatDate = (dateStr) => new Date(dateStr).toLocaleString('pt-BR');

// Traduz nomes técnicos do banco para português
const labelMap = {
  nome_completo: 'Nome',
  cpf: 'CPF',
  salario_bruto: 'Salário',
  cargo: 'Cargo',
  departamento: 'Departamento',
  status: 'Status',
  banco_nome: 'Banco',
  banco_agencia: 'Agência',
  banco_conta_numero: 'Conta',
  email_corporativo: 'Email Corp.',
  endereco_rua: 'Rua',
  endereco_cep: 'CEP'
};

export default function TimelineAuditoria({ registroId = null, global = false }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      let query = supabase
        .from('logs_auditoria')
        .select('*')
        .order('data_alteracao', { ascending: false })
        .limit(50); // Limita aos últimos 50 para não travar

      // Se passou um ID, filtra só aquele registro (uso no Perfil do Funcionário)
      if (registroId) {
        query = query.eq('registro_id', registroId);
      }
      // Se for global (uso na tela de Ajustes), pega tudo de tabelas críticas
      else if (global) {
        query = query.in('tabela_afetada', ['funcionarios', 'cargos']);
      }

      const { data, error } = await query;
      if (!error) setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();
  }, [registroId, global]);

  if (loading) return <div className="loading-spinner">Carregando auditoria...</div>;
  
  if (logs.length === 0) {
    return <div className="empty-audit">Nenhuma alteração crítica registrada recentemente.</div>;
  }

  return (
    <div className="timeline-wrapper">
      <h4 className="timeline-title">
        <span className="material-symbols-outlined">security</span>
        {global ? 'Últimas Alterações no Sistema' : 'Trilha de Auditoria do Colaborador'}
      </h4>
      
      <div className="timeline-list">
        {logs.map((log) => (
          <div key={log.id} className="timeline-item">
            <div className="timeline-icon">
               <span className="material-symbols-outlined">edit_note</span>
            </div>
            
            <div className="timeline-content">
              <div className="timeline-header">
                <span className="timeline-date">{formatDate(log.data_alteracao)}</span>
                <span className="timeline-tag">{log.tipo_operacao === 'UPDATE' ? 'Edição' : 'Exclusão'}</span>
              </div>

              <div className="changes-grid">
                {log.colunas_alteradas && log.colunas_alteradas.map(col => {
                  // Pula colunas técnicas
                  if (['updated_at', 'id', 'user_id'].includes(col)) return null;

                  const valorAntigo = log.dados_antigos ? log.dados_antigos[col] : 'Vazio';
                  const valorNovo = log.dados_novos ? log.dados_novos[col] : 'Excluído';

                  return (
                    <div key={col} className="change-row">
                      <span className="field-label">{labelMap[col] || col}:</span>
                      <span className="old-val">{String(valorAntigo)}</span>
                      <span className="arrow">➝</span>
                      <span className="new-val">{String(valorNovo)}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Se quiser mostrar quem fez, precisaria de um join ou query extra, 
                  mas o ID já está em log.usuario_responsavel */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}