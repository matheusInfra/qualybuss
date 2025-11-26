// src/pages/AusenciasPage.jsx
import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import './AusenciasPage.css';

// Sub-componentes das Abas
import MuralMovimentacoes from '../components/Ausencias/MuralMovimentacoes';
import HistoricoAusencias from '../components/Ausencias/HistoricoAusencias';
import PainelSaldos from '../components/Ausencias/PainelSaldos';

// Modais
import ModalLancarMovimento from '../components/Modal/ModalLancarMovimento';
import ModalAjusteSaldo from '../components/Modal/ModalAjusteSaldo'; // <--- IMPORTAÇÃO QUE FALTAVA

function AusenciasPage() {
  const [activeTab, setActiveTab] = useState('mural');
  
  // Estados dos Modais
  const [modalLancamento, setModalLancamento] = useState(null); // { tipo: 'novo' | 'editar', id, origem }
  const [modalAjuste, setModalAjuste] = useState(null); // { isOpen: bool, funcionario: obj }

  // Handlers para Lançamento (Mural)
  const abrirNovoLancamento = () => setModalLancamento({ tipo: 'novo' });
  const fecharModalLancamento = () => setModalLancamento(null);

  // Handlers para Ajuste (Saldos) <--- LÓGICA QUE FALTAVA
  const abrirAjuste = (funcionario) => {
    setModalAjuste({ isOpen: true, funcionario });
  };
  const fecharAjuste = () => {
    setModalAjuste(null);
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
          <MuralMovimentacoes 
            onEditar={(id, tipo) => setModalLancamento({ tipo: 'editar', id, origem: tipo })} 
          />
        )}
        
        {activeTab === 'historico' && (
          <HistoricoAusencias />
        )}
        
        {activeTab === 'saldos' && (
          <PainelSaldos 
            aoVerExtrato={() => setActiveTab('historico')}
            aoAjustar={abrirAjuste} // <--- PASSANDO A FUNÇÃO AQUI
          />
        )}
      </div>

      {/* --- MODAIS --- */}
      
      {/* 1. Modal de Lançamento (Férias/Ausências) */}
      <ModalLancarMovimento
        isOpen={!!modalLancamento}
        onClose={fecharModalLancamento}
        idParaEditar={modalLancamento?.id}
        tipoInicial={modalLancamento?.origem === 'credito' ? 'credito' : 'debito'}
      />

      {/* 2. Modal de Ajuste Técnico (Saldos) - O MÓDULO NOVO */}
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