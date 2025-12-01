import React from 'react';
import './ModalConfirmacao.css';

function ModalConfirmacao({ 
  isOpen, 
  title = "Confirmação", 
  message = "Deseja prosseguir?", 
  confirmLabel = "Confirmar", 
  cancelLabel = "Cancelar", 
  onConfirm, 
  onCancel,
  variant = 'primary' 
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay-confirm" onClick={onCancel}>
      <div className="modal-card-confirm" onClick={e => e.stopPropagation()}>
        <div className={`modal-icon-confirm ${variant}`}>
          {variant === 'danger' && <span className="material-symbols-outlined">warning</span>}
          {variant === 'warning' && <span className="material-symbols-outlined">info</span>}
          {variant === 'primary' && <span className="material-symbols-outlined">help</span>}
        </div>
        
        <h3 className="modal-title-confirm">{title}</h3>
        <p className="modal-message-confirm">{message}</p>
        
        <div className="modal-actions-confirm">
          <button className="btn-cancel-confirm" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`btn-action-confirm ${variant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacao;