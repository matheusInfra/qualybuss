import React from 'react';
import FormularioMovimentacao from '../Ausencias/FormularioMovimentacao';
import './ModalLancarMovimento.css'; 

function ModalLancarMovimento({ isOpen, onClose, idParaEditar }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      {/* Removemos a lógica antiga de abas interna, pois o FormularioMovimentacao já tem */}
      <div className="modal-content-movimento">
        <div className="modal-header-movimento">
          <h3>{idParaEditar ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="modal-body-movimento">
          <FormularioMovimentacao 
            onClose={onClose} 
            idParaEditar={idParaEditar} 
          />
        </div>
      </div>
    </div>
  );
}

export default ModalLancarMovimento;