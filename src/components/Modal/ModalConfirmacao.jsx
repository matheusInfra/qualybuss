import React from 'react';
import './ModalConfirmacao.css';

function ModalConfirmacao({ isOpen, onClose, onConfirm, title, children }) {
  // Se não estiver aberto, não renderiza nada
  if (!isOpen) {
    return null;
  }

  // Impede que o clique no modal feche o modal (propagaçao)
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

  return (
    // O 'fundo' escuro que fecha o modal ao clicar
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={handleModalClick}>
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">
          {children}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="modal-button-secondary">
            Cancelar
          </button>
          <button onClick={onConfirm} className="modal-button-danger">
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacao;