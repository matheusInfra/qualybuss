// src/pages/AusenciasPage.jsx
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import './AusenciasPage.css';

// Serviços
import { getMuralRecente } from '../services/ausenciaService';

// Sub-componentes
import MuralMovimentacoes from '../components/Ausencias/MuralMovimentacoes';
import HistoricoAusencias from '../components/Ausencias/HistoricoAusencias';
import PainelSaldos from '../components/Ausencias/PainelSaldos';
import AprovacaoPendencias from '../components/Ausencias/AprovacaoPendencias'; // [NOVO]

// Modais
import ModalLancarMovimento from '../components/Modal/ModalLancarMovimento';
import ModalAjusteSaldo from '../components/Modal/ModalAjusteSaldo';

function AusenciasPage() {
  const [activeTab, setActiveTab] = useState('aprovacao'); // Foco inicial na Aprovação
  
  const [muralData, setMuralData] = useState([]);
  const [isLoadingMural, setIsLoadingMural] = useState(true);

  const [modalLancamento, setModalLancamento] = useState(null); 
  const [modalAjuste, setModalAjuste] = useState(null); 

  // Carrega dados do mural apenas quando a aba é selecionada
  useEffect(() => {
    if (activeTab === 'mural') {
        carregarDadosMural();
    }
  }, [activeTab]);

  const carregarDadosMural = async () => {
    setIsLoadingMural(true);
    try {
      const dados = await getMuralRecente();
      
      const ausenciasFormatadas = (dados.ausencias || []).map(item => ({
        ...item,
        categoria_origem: 'ausencia'
      }));

      const creditosFormatados = (dados.creditos || []).map(item => ({
        ...item,
        id: item.id,
        tipo: item.tipo || 'Crédito',
        data_inicio: item.data_lancamento,
        data_fim: item.data_lancamento,
        observacao: item.motivo,
        status: 'Concluído',
        categoria_origem: 'credito'
      }));
      
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

  const abrirNovoLancamento = () => setModalLancamento({ tipo: 'novo' });
  const fecharModalLancamento = () => {
    setModalLancamento(null);
    if (activeTab === 'mural') carregarDadosMural(); 
  };

  const abrirAjuste = (funcionario) => {
    setModalAjuste({ isOpen: true, funcionario });
  };
  const fecharAjuste = () => {
    setModalAjuste(null);
  };

  return (
    <div className="ausencias-container">
      <div className="ausencias-header">
        <div>
          <h1 className="page-title">Gestão de Ausências</h1>
          <p className="page-subtitle">Centralize aprovações e controle de férias.</p>
        </div>
        
        <button className="button-novo-lancamento" onClick={abrirNovoLancamento}>
          <span className="material-symbols-outlined">add_circle</span>
          Novo Lançamento
        </button>
      </div>

      <div className="ausencias-tabs">
        <button 
          className={`tab-btn-destaque ${activeTab === 'aprovacao' ? 'active' : ''}`} 
          onClick={() => setActiveTab('aprovacao')}
        >
          <span className="material-symbols-outlined icon-tab">gavel</span>
          Aprovações
        </button>

        <button 
          className={activeTab === 'mural' ? 'active' : ''} 
          onClick={() => setActiveTab('mural')}
        >
          Mural Recente
        </button>
        <button 
          className={activeTab === 'saldos' ? 'active' : ''} 
          onClick={() => setActiveTab('saldos')}
        >
          Gestão de Saldos
        </button>
        <button 
          className={activeTab === 'historico' ? 'active' : ''} 
          onClick={() => setActiveTab('historico')}
        >
          Histórico & Auditoria
        </button>
      </div>

      <div className="ausencias-tab-content">
        {activeTab === 'aprovacao' && (
          <AprovacaoPendencias />
        )}

        {activeTab === 'mural' && (
          isLoadingMural ? (
            <div style={{padding: 20, textAlign: 'center'}}>Carregando mural...</div>
          ) : (
            <MuralMovimentacoes 
              movimentacoes={muralData} 
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