// src/pages/AusenciasPage.jsx

import React, { useState } from 'react';

// 1. Importa os componentes das abas e o modal
import MuralMovimentacoes from '../components/Ausencias/MuralMovimentacoes';
import ModalLancarMovimento from '../components/Modal/ModalLancarMovimento';
import GestaoSaldos from '../components/Ausencias/PainelSaldos'; //

// 2. Importa o CSS das abas
import './AusenciasPage.css'; //

function AusenciasPage() {
  // 3. Estado que controla o modal de Lançamento (Criar/Editar)
  const [modalState, setModalState] = useState({
    isOpen: false,
    idParaEditar: null,
    tipo: 'debito' // 'debito' ou 'credito'
  });
  
  // 4. Novo estado para controlar as abas
  const [activeTab, setActiveTab] = useState('mural'); // 'mural' ou 'saldos'

  // 5. Funções para abrir o modal
  const handleOpenModalCriar = () => {
    setModalState({ isOpen: true, idParaEditar: null, tipo: 'debito' });
  };
  
  // Esta função é chamada pelo Mural ao clicar em "Editar"
  const handleOpenModalEditar = (id, tipo) => {
    setModalState({ isOpen: true, idParaEditar: id, tipo: tipo });
  };

  // 6. Função para fechar o modal
  const handleCloseModal = () => {
    setModalState({ isOpen: false, idParaEditar: null, tipo: 'debito' });
  };

  return (
    <div className="ausencias-container">
      {/* Cabeçalho da Página */}
      <div className="ausencias-header">
        <h1>Gestão de Ausências</h1>
        <button className="button-novo-lancamento" onClick={handleOpenModalCriar}>
          + Novo Lançamento
        </button>
      </div>

      {/* O Novo Menu de Abas */}
      <div className="ausencias-tabs" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('mural')}
          className={activeTab === 'mural' ? 'active' : ''}
        >
          Mural de Lançamentos
        </button>
        <button
          onClick={() => setActiveTab('saldos')}
          className={activeTab === 'saldos' ? 'active' : ''}
        >
          Painel de Saldos
        </button>
      </div>

      {/* Conteúdo das Abas */}
      <div className="ausencias-tab-content">
        {activeTab === 'mural' && (
          // Aba 1: O Mural de cards com CRUD
          <MuralMovimentacoes onEditarClick={handleOpenModalEditar} />
        )}

        {activeTab === 'saldos' && (
          // Aba 2: O Painel de Saldos que você pediu
          // Este componente já calcula e exibe as folgas e banco de horas
          <GestaoSaldos /> //
        )}
      </div>

      {/* O Modal de Lançamento (renderizado condicionalmente) */}
      {modalState.isOpen && (
        <ModalLancarMovimento
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
          idParaEditar={modalState.idParaEditar}
          tipoInicial={modalState.tipo}
        />
      )}
    </div>
  );
}

export default AusenciasPage;