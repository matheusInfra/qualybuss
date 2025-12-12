import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { solicitarAjuste } from '../../services/ausenciaService';
import './ModalSolicitarAjuste.css';

function ModalSolicitarAjuste({ ausencia, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [form, setForm] = useState({
    tipo_ajuste: 'Erro Operacional',
    justificativa: '',
    nova_data_inicio: new Date(ausencia.data_inicio).toISOString().split('T')[0],
    nova_data_fim: new Date(ausencia.data_fim).toISOString().split('T')[0],
    novo_tipo: ausencia.tipo
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (form.justificativa.length < 5) return toast.error("Justifique a alteração.");
    
    setLoading(true);
    try {
      // Prepara o pacote de dados para o Inbox
      const payload = {
        ausencia_id: ausencia.id,
        tipo_ajuste: form.tipo_ajuste,
        justificativa: form.justificativa,
        dados_anteriores: { // Snapshot do estado atual
          tipo: ausencia.tipo,
          data_inicio: ausencia.data_inicio,
          data_fim: ausencia.data_fim
        },
        novos_dados: { // O que se deseja aplicar
          tipo: form.novo_tipo,
          data_inicio: form.nova_data_inicio,
          data_fim: form.nova_data_fim
        }
      };

      await solicitarAjuste(payload);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Solicitar Retificação</h3>
          <button onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <>
              <p className="helper-text">Este registro entrará em análise antes de ser alterado.</p>
              <div className="form-group">
                <label>Motivo</label>
                <select name="tipo_ajuste" value={form.tipo_ajuste} onChange={handleChange}>
                  <option>Erro Operacional</option>
                  <option>Cancelamento</option>
                  <option>Mudança de Datas</option>
                </select>
              </div>
              <div className="form-group">
                <label>Justificativa *</label>
                <textarea name="justificativa" rows="3" value={form.justificativa} onChange={handleChange}></textarea>
              </div>
              <button className="button-primary w-full mt-4" onClick={() => setStep(2)}>Próximo: Dados Corretos</button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label>Tipo Correto</label>
                <select name="novo_tipo" value={form.novo_tipo} onChange={handleChange}>
                  <option value="Férias">Férias</option>
                  <option value="Folga Pessoal">Folga Pessoal</option>
                  <option value="Atestado Médico">Atestado Médico</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Início Correto</label>
                  <input type="date" name="nova_data_inicio" value={form.nova_data_inicio} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Fim Correto</label>
                  <input type="date" name="nova_data_fim" value={form.nova_data_fim} onChange={handleChange} />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="button-secondary flex-1" onClick={() => setStep(1)}>Voltar</button>
                <button className="button-primary flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar Solicitação'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalSolicitarAjuste;