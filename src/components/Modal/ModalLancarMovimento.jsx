// src/components/Modal/ModalLancarMovimento.jsx
import React, { useState } from 'react';
import LancarAusenciaForm from '../Ausencias/LancarAusenciaForm';
import LancarCreditoForm from '../Ausencias/LancarCreditoForm';

// 1. Importe o CSS para este modal (criaremos a seguir)
import './ModalLancarMovimento.css';

function ModalLancarMovimento({ isOpen, onClose, idParaEditar, tipoInicial }) {
  // O 'tipoInicial' (debito/credito) é usado ao clicar em "Editar"
  const [activeTab, setActiveTab] = useState(tipoInicial || 'debito');

  // Não renderiza nada se não estiver aberto
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-lancamento" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header-lancamento">
          <h2 className="modal-title-lancamento">
            {idParaEditar ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>

        <div className="modal-body-lancamento">
          {/* O TOGGLE DE ESCOLHA 
            (Só aparece ao CRIAR. Ao editar, ele trava no tipo correto)
          */}
          {!idParaEditar && (
            <div className="tipo-lancamento-toggle">
              <button
                onClick={() => setActiveTab('debito')}
                className={activeTab === 'debito' ? 'active debito' : ''}
              >
                Lançar Ausência (Débito)
              </button>
              <button
                onClick={() => setActiveTab('credito')}
                className={activeTab === 'credito' ? 'active credito' : ''}
              >
                Lançar Folga (Crédito)
              </button>
            </div>
          )}

          {/* O FORMULÁRIO CORRETO É RENDERIZADO AQUI
            Passamos o 'idParaEditar' e o 'onClose' para os forms da Fase 1
          */}
          <div className="form-wrapper">
            {activeTab === 'debito' ? (
              <LancarAusenciaForm 
                idParaEditar={idParaEditar} 
                onClose={onClose} 
              />
            ) : (
              <LancarCreditoForm 
                idParaEditar={idParaEditar} 
                onClose={onClose} 
              />
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default ModalLancarMovimento;