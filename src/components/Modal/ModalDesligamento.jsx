import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { desligarFuncionario } from '../../services/funcionarioService';
import './ModalDesligamento.css';

export default function ModalDesligamento({ funcionario, onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    if (!window.confirm(`Tem certeza que deseja desligar ${funcionario.nome_completo}?`)) return;

    setLoading(true);
    try {
      await desligarFuncionario(funcionario.id, {
        data_desligamento: data.data_desligamento,
        motivo_desligamento: data.motivo,
        observacoes: data.observacoes
      });
      
      toast.success('Desligamento registrado com sucesso.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar desligamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-danger">
        <div className="modal-header-danger">
          <h3>Registrar Desligamento</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="modal-body">
          <div className="alert-box">
            <span className="material-symbols-outlined">warning</span>
            <p>Você está prestes a desligar <strong>{funcionario.nome_completo}</strong>. O status será alterado para "Desligado".</p>
          </div>

          <div className="form-group">
            <label>Data do Desligamento</label>
            <input 
              type="date" 
              {...register('data_desligamento', { required: 'Data é obrigatória' })} 
              className={errors.data_desligamento ? 'error' : ''}
            />
            {errors.data_desligamento && <span className="error-msg">{errors.data_desligamento.message}</span>}
          </div>

          <div className="form-group">
            <label>Motivo</label>
            <select {...register('motivo', { required: 'Selecione um motivo' })}>
              <option value="">Selecione...</option>
              <option value="Sem Justa Causa">Demissão sem Justa Causa</option>
              <option value="Com Justa Causa">Demissão por Justa Causa</option>
              <option value="Pedido de Demissão">Pedido de Demissão</option>
              <option value="Término de Contrato">Término de Contrato</option>
              <option value="Acordo">Acordo (Comum Acordo)</option>
            </select>
            {errors.motivo && <span className="error-msg">{errors.motivo.message}</span>}
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea 
              {...register('observacoes')} 
              placeholder="Detalhes adicionais sobre o desligamento..."
              rows="3"
            ></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancelar</button>
            <button type="submit" className="btn-confirm-danger" disabled={loading}>
              {loading ? 'Processando...' : 'Confirmar Desligamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}