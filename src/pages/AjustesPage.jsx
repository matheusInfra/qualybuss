// src/pages/AjustesPage.jsx
import React, { useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../services/supabaseClient';
import ModalSolicitarAjuste from '../components/Modal/ModalSolicitarAjuste';
import { toast } from 'react-hot-toast';
import './AjustesPage.css'; // Vamos criar um CSS básico abaixo ou reutilize

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

  // 2. Função para buscar registro oficial para corrigir
  const handleBuscarRegistro = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;
    
    const toastId = toast.loading('Buscando...');
    
    // Busca na tabela de ausências por protocolo (ID) ou tenta achar pelo nome do funcionário (mais complexo, aqui simplificado pelo ID ou data)
    // Para simplificar UX, vamos buscar registros "Aprovados" recentes desse funcionário se for texto, ou ID direto.
    
    // ESTRATÉGIA DE BUSCA: Vamos buscar ausências Aprovadas que batam com o termo (supomos que seja o ID por enquanto para precisão, ou implementamos busca de nome depois)
    // Nota: Para buscar por nome do funcionário precisaria de um join. Vamos manter simples: Busca por ID ou lista os últimos 10 aprovados para selecionar.
    
    const { data, error } = await supabase
        .from('solicitacoes_ausencia')
        .select(`*, funcionarios(nome_completo)`)
        .eq('status', 'Aprovado')
        .order('data_inicio', { ascending: false })
        .limit(10); // Traz os últimos 10 aprovados para o usuário escolher

    toast.dismiss(toastId);
    
    if (error || !data || data.length === 0) {
      toast.error('Nenhum registro consolidado recente encontrado.');
      return;
    }
    
    // Abre um mini-modal de seleção ou seta o primeiro (aqui vamos simplificar mostrando uma lista filtrada na tela)
    // Para este exemplo, vamos supor que o usuário clica num botão "Corrigir" numa lista abaixo.
  };
  
  // Lista de registros Aprovados (para o usuário selecionar qual corrigir)
  const { data: registrosRecentes } = useSWR('registros_aprovados', async () => {
     const { data } = await supabase
        .from('solicitacoes_ausencia')
        .select(`*, funcionarios(nome_completo, cargo)`)
        .eq('status', 'Aprovado')
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
            {registrosFiltrados?.map(reg => (
              <div key={reg.id} className="item-registro p-3 border mb-2 rounded hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <div className="font-bold text-sm">{reg.funcionarios?.nome_completo}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(reg.data_inicio).toLocaleDateString()} a {new Date(reg.data_fim).toLocaleDateString()}
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
            {auditoria?.map(log => {
              const dadosAntigos = log.dados_anteriores;
              const dadosNovos = log.dados_novos;
              
              return (
                <div key={log.id} className="log-item mb-4 p-3 bg-white rounded border-l-4 border-blue-500 shadow-sm text-sm">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                    <span className="font-mono">{log.tipo_ajuste}</span>
                  </div>
                  <div className="font-medium text-gray-800 mb-1">
                    "{log.justificativa}"
                  </div>
                  <div className="diff-box bg-gray-100 p-2 rounded text-xs font-mono mt-2">
                    <div className="text-red-500">- {new Date(dadosAntigos.data_inicio).toLocaleDateString()} ({dadosAntigos.tipo})</div>
                    <div className="text-green-600">+ {new Date(dadosNovos.data_inicio).toLocaleDateString()} ({dadosNovos.tipo})</div>
                  </div>
                </div>
              );
            })}
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