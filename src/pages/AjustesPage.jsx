// src/pages/AjustesPage.jsx
import React, { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../services/supabaseClient';
import ModalSolicitarAjuste from '../components/Modal/ModalSolicitarAjuste';
import { toast } from 'react-hot-toast';
import './AjustesPage.css';

function AjustesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [registroParaAjuste, setRegistroParaAjuste] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Busca Auditoria (Logs)
  const { data: auditoria, mutate: refreshAuditoria } = useSWR('auditoria_recente', async () => {
    const { data, error } = await supabase
      .from('auditoria_ajustes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  });

  // Lista de registros Aprovados (para o usuário selecionar qual corrigir)
  const { data: registrosRecentes } = useSWR('registros_aprovados', async () => {
     const { data } = await supabase
        .from('solicitacoes_ausencia')
        .select(`*, funcionarios(nome_completo, cargo)`)
        .eq('status', 'Aprovado') // Só permite corrigir o que já foi aprovado
        .order('created_at', { ascending: false })
        .limit(50);
     return data;
  });

  // Filtro local simples
  const registrosFiltrados = registrosRecentes?.filter(r => 
    r.funcionarios?.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ajustes-container" style={{ padding: '24px' }}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Central de Retificação & Auditoria</h1>
        <p className="text-gray-500">Correção segura de registros consolidados e visualização de logs fiscais.</p>
      </header>

      <div className="grid-ajustes" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* COLUNA ESQUERDA: OPERAÇÃO (CORRIGIR) */}
        <div className="card-operacao bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">🛠️ Realizar Correção</h2>
          
          <div className="search-box mb-6">
            <input 
              type="text" 
              placeholder="Buscar por nome do colaborador..." 
              className="w-full p-2 border rounded"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="lista-registros overflow-y-auto" style={{ maxHeight: '400px' }}>
            {registrosFiltrados?.length === 0 && <p className="text-gray-400 text-sm">Nenhum registro encontrado.</p>}
            
            {registrosFiltrados?.map(reg => (
              <div key={reg.id} className="item-registro p-3 border mb-2 rounded hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">{reg.funcionarios?.nome_completo}</div>
                  <div className="text-xs text-gray-500">
                    {/* Formatação segura de data */}
                    {reg.data_inicio ? new Date(reg.data_inicio).toLocaleDateString() : 'N/A'} a {reg.data_fim ? new Date(reg.data_fim).toLocaleDateString() : 'N/A'}
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">{reg.tipo}</span>
                  </div>
                </div>
                <button 
                  className="btn-corrigir text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-100"
                  onClick={() => {
                    setRegistroParaAjuste(reg);
                    setIsModalOpen(true);
                  }}
                >
                  Retificar
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA DIREITA: VISUALIZAÇÃO (AUDITORIA) */}
        <div className="card-auditoria bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">📜 Log de Auditoria (Últimas ações)</h2>
          
          <div className="timeline-auditoria overflow-y-auto" style={{ maxHeight: '450px' }}>
            {auditoria?.map(log => (
              <div key={log.id} className="log-item mb-4 p-3 bg-white rounded border-l-4 border-blue-500 shadow-sm text-sm">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{new Date(log.created_at).toLocaleString()}</span>
                  <span className="font-mono bg-blue-100 text-blue-800 px-1 rounded">{log.tipo_acao}</span>
                </div>
                
                <div className="font-medium text-gray-800 mb-1 italic">
                  "{log.justificativa || 'Sem justificativa'}"
                </div>
                
                {/* CORREÇÃO DO ERRO AQUI: Exibimos as strings diretamente */}
                <div className="diff-box bg-gray-100 p-2 rounded text-xs font-mono mt-2 border border-gray-200">
                  <div className="text-red-500 flex items-start">
                    <span className="mr-1">-</span> 
                    {log.valor_anterior || 'N/A'}
                  </div>
                  <div className="text-green-600 flex items-start mt-1">
                    <span className="mr-1">+</span> 
                    {log.valor_novo || 'N/A'}
                  </div>
                </div>
              </div>
            ))}
            {!auditoria?.length && <p className="text-center text-gray-400 mt-10">Nenhuma retificação registrada.</p>}
          </div>
        </div>
      </div>

      {/* MODAL DE AJUSTE */}
      {isModalOpen && registroParaAjuste && (
        <ModalSolicitarAjuste 
          ausencia={registroParaAjuste}
          onClose={() => { setIsModalOpen(false); setRegistroParaAjuste(null); }}
          onSuccess={() => { refreshAuditoria(); toast.success("Lista de registros atualizada"); }}
        />
      )}
    </div>
  );
}

export default AjustesPage;