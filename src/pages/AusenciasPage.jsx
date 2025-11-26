// src/pages/AusenciasPage.jsx
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import './AusenciasPage.css';

// Serviços (ADICIONADO)
import { getMuralRecente } from '../services/ausenciaService';

// Sub-componentes das Abas
import MuralMovimentacoes from '../components/Ausencias/MuralMovimentacoes';
import HistoricoAusencias from '../components/Ausencias/HistoricoAusencias';
import PainelSaldos from '../components/Ausencias/PainelSaldos';

// Modais
import ModalLancarMovimento from '../components/Modal/ModalLancarMovimento';
import ModalAjusteSaldo from '../components/Modal/ModalAjusteSaldo';

function AusenciasPage() {
  const [activeTab, setActiveTab] = useState('mural');
  
  // Estado para armazenar os dados do Mural (ADICIONADO)
  const [muralData, setMuralData] = useState([]);
  const [isLoadingMural, setIsLoadingMural] = useState(true);

  // Estados dos Modais
  const [modalLancamento, setModalLancamento] = useState(null); 
  const [modalAjuste, setModalAjuste] = useState(null); 

  // --- EFEITO PARA BUSCAR DADOS (ADICIONADO) ---
  useEffect(() => {
    carregarDadosMural();
  }, []);

  const carregarDadosMural = async () => {
    setIsLoadingMural(true);
    try {
      const dados = await getMuralRecente();
      
      // Precisamos unificar as listas (ausências, créditos e períodos) 
      // para exibir tudo no mural, ou filtrar apenas o que você deseja.
      // Aqui estou padronizando tudo para o formato que o Card espera.
      
      const ausenciasFormatadas = (dados.ausencias || []).map(item => ({
        ...item,
        categoria_origem: 'ausencia' // Flag para saber a origem se precisar
      }));

      const creditosFormatados = (dados.creditos || []).map(item => ({
        ...item,
        id: item.id,
        tipo: item.tipo || 'Crédito',
        data_inicio: item.data_lancamento, // Mapeando para data_inicio
        data_fim: item.data_lancamento,    // Crédito pontual tem fim igual início
        observacao: item.motivo,           // Mapeando motivo para observacao
        status: 'Concluído',               // Créditos já nascem concluídos
        categoria_origem: 'credito'
      }));
      
      // Juntamos tudo e ordenamos por data
      const tudoMisturado = [...ausenciasFormatadas, ...creditosFormatados].sort((a, b) => {
        return new Date(b.data_inicio) - new Date(a.data_inicio);
      });

      setMuralData(tudoMisturado);

    } catch (error) {
      console.error("Erro ao carregar mural:", error);
    } finally {
      setIsLoadingMural(false);
    }
  };

  // Handlers para Lançamento
  const abrirNovoLancamento = () => setModalLancamento({ tipo: 'novo' });
  const fecharModalLancamento = () => {
    setModalLancamento(null);
    carregarDadosMural(); // Recarrega o mural após salvar
  };

  // Handlers para Ajuste
  const abrirAjuste = (funcionario) => {
    setModalAjuste({ isOpen: true, funcionario });
  };
  const fecharAjuste = () => {
    setModalAjuste(null);
    // Se quiser atualizar saldos ou algo assim, chame aqui
  };

  return (
    <div className="ausencias-container">
      {/* Cabeçalho Fixo */}
      <div className="ausencias-header">
        <div>
          <h1 className="page-title">Central de Ausências</h1>
          <p className="page-subtitle">Gerencie férias, folgas e banco de horas.</p>
        </div>
        
        <button className="button-novo-lancamento" onClick={abrirNovoLancamento}>
          <span className="material-symbols-outlined">add_circle</span>
          Novo Lançamento
        </button>
      </div>

      {/* Navegação por Abas */}
      <div className="ausencias-tabs">
        <button 
          className={activeTab === 'mural' ? 'active' : ''} 
          onClick={() => setActiveTab('mural')}
        >
          Mural Recente
        </button>
        <button 
          className={activeTab === 'historico' ? 'active' : ''} 
          onClick={() => setActiveTab('historico')}
        >
          Histórico & Auditoria
        </button>
        <button 
          className={activeTab === 'saldos' ? 'active' : ''} 
          onClick={() => setActiveTab('saldos')}
        >
          Gestão de Saldos
        </button>
      </div>

      {/* Área de Conteúdo Dinâmico */}
      <div className="ausencias-tab-content">
        {activeTab === 'mural' && (
          // CORREÇÃO AQUI: Passando os dados para o componente
          isLoadingMural ? (
            <div style={{padding: 20, textAlign: 'center'}}>Carregando mural...</div>
          ) : (
            <MuralMovimentacoes 
              movimentacoes={muralData} // <--- AQUI ESTAVA O ERRO (Faltava essa prop)
              onEditar={(id, tipo) => setModalLancamento({ tipo: 'editar', id, origem: tipo })} 
            />
          )
        )}
        
        {activeTab === 'historico' && (
          <HistoricoAusencias />
        )}
        
        {activeTab === 'saldos' && (
          <PainelSaldos 
            aoVerExtrato={() => setActiveTab('historico')}
            aoAjustar={abrirAjuste}
          />
        )}
      </div>

      {/* --- MODAIS --- */}
      
      <ModalLancarMovimento
        isOpen={!!modalLancamento}
        onClose={fecharModalLancamento}
        idParaEditar={modalLancamento?.id}
        tipoInicial={modalLancamento?.origem === 'credito' ? 'credito' : 'debito'}
      />

      {modalAjuste && (
        <ModalAjusteSaldo
          isOpen={modalAjuste.isOpen}
          onClose={fecharAjuste}
          funcionario={modalAjuste.funcionario}
        />
      )}

    </div>
  );
}

export default AusenciasPage;