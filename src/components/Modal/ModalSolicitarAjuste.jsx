// src/components/Modal/ModalSolicitarAjuste.jsx
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import './ModalAjusteSaldo.css'; // Podemos reutilizar o CSS do modal de saldo ou criar um novo

function ModalSolicitarAjuste({ ausencia, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Justificativa, 2: Novos Dados
  
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

  const handleNext = () => {
    if (form.justificativa.length < 10) {
      toast.error("A justificativa deve ser detalhada (min. 10 caracteres).");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const toastId = toast.loading("Processando retificação segura...");

    try {
      // Chamada RPC (Remote Procedure Call) para o Backend Blindado
      // Essa função será criada no Passo 3
      const { error } = await supabase.rpc('processar_ajuste_ausencia', {
        p_ausencia_id: ausencia.id,
        p_tipo_ajuste: form.tipo_ajuste,
        p_justificativa: form.justificativa,
        p_nova_data_inicio: form.nova_data_inicio,
        p_nova_data_fim: form.nova_data_fim,
        p_novo_tipo: form.novo_tipo
      });

      if (error) throw error;

      toast.success("Ajuste registrado e auditado com sucesso!", { id: toastId });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar ajuste: " + error.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header warning-header">
          <h3>⚠️ Retificação de Registro Consolidado</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="step-container">
              <p className="text-sm text-gray-600 mb-4">
                Este registro já foi aprovado. Qualquer alteração será gravada na 
                <strong> Tabela de Auditoria Fiscal</strong>.
              </p>

              <div className="form-group">
                <label>Tipo de Ocorrência</label>
                <select name="tipo_ajuste" value={form.tipo_ajuste} onChange={handleChange}>
                  <option value="Erro Operacional">Erro de Digitação / Operacional</option>
                  <option value="Cancelamento">Cancelamento da Ausência</option>
                  <option value="Mudança de Data">Alteração de Datas (Solicitado pelo Gestor)</option>
                  <option value="Interrupção Legal">Interrupção Legal (Ex: Doença durante férias)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Justificativa Obrigatória</label>
                <textarea 
                  name="justificativa" 
                  rows="4" 
                  className="w-full border p-2 rounded"
                  placeholder="Descreva detalhadamente o motivo da alteração..."
                  value={form.justificativa}
                  onChange={handleChange}
                ></textarea>
              </div>

              <button className="button-primary w-full mt-4" onClick={handleNext}>
                Continuar para Dados &raquo;
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="step-container">
              <h4 className="font-bold mb-3">Informe os Dados Corretos</h4>
              
              <div className="form-group">
                <label>Novo Tipo</label>
                <select name="novo_tipo" value={form.novo_tipo} onChange={handleChange}>
                  <option value="Férias">Férias</option>
                  <option value="Folga Pessoal">Folga Pessoal</option>
                  <option value="Atestado Médico">Atestado Médico</option>
                  {/* Outros tipos... */}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>Nova Data Início</label>
                  <input type="date" name="nova_data_inicio" value={form.nova_data_inicio} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Nova Data Fim</label>
                  <input type="date" name="nova_data_fim" value={form.nova_data_fim} onChange={handleChange} />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button className="button-secondary flex-1" onClick={() => setStep(1)}>Voltar</button>
                <button 
                  className="button-primary flex-1 bg-red-600 hover:bg-red-700 text-white" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Auditando...' : 'Confirmar Retificação'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalSolicitarAjuste;