// src/pages/AusenciasPage.jsx
import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast'; // Para garantir toasts nesta tela
import './AusenciasPage.css';

// Sub-componentes das Abas
import MuralMovimentacoes from '../components/Ausencias/MuralMovimentacoes';
import HistoricoAusencias from '../components/Ausencias/HistoricoAusencias';
import PainelSaldos from '../components/Ausencias/PainelSaldos';

// Modais de Lançamento
import ModalLancarMovimento from '../components/Modal/ModalLancarMovimento';

function AusenciasPage() {
  const [activeTab, setActiveTab] = useState('mural');
  const [modalAberto, setModalAberto] = useState(null); // 'novo_lancamento', 'editar_...'

  // Controle do Modal de Lançamento
  const abrirNovoLancamento = () => setModalAberto({ tipo: 'novo' });
  const fecharModal = () => setModalAberto(null);

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
            onEditar={(id, tipo) => setModalAberto({ tipo: 'editar', id, origem: tipo })} 
          />
        )}
        
        {activeTab === 'historico' && (
          <HistoricoAusencias />
        )}
        
        {activeTab === 'saldos' && (
          <PainelSaldos 
            aoVerExtrato={() => setActiveTab('historico')} // Link entre abas
          />
        )}
      </div>

      {/* Modais Globais */}
      <ModalLancarMovimento
        isOpen={!!modalAberto}
        onClose={fecharModal}
        idParaEditar={modalAberto?.id}
        tipoInicial={modalAberto?.origem === 'credito' ? 'credito' : 'debito'}
      />
    </div>
  );
}

export default AusenciasPage;