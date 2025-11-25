import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { differenceInDays, parseISO } from 'date-fns';
import './LancarAusenciaForm.css'; // CSS Reutilizado
import { getFuncionarios } from '../../services/funcionarioService';
import { createCreditoSaldo, getCreditoById, updateCredito } from '../../services/ausenciaService';

const initialState = {
  funcionario_id: '',
  tipo: '',
  quantidade: '',
  unidade: 'dias',
  motivo: '',
  data_inicio: new Date().toISOString().split('T')[0], // Renomeado
  data_fim: '', // Novo Campo
  data_limite: '', // Novo Campo (opcional para férias)
};

function LancarCreditoForm({ idParaEditar = null, onClose }) {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWRConfig();
  const isEditMode = Boolean(idParaEditar);

  const { data: funcionarios, isLoading: loadingFunc } = useSWR('getFuncionarios', getFuncionarios, { revalidateOnFocus: false });
  const { data: dadosCredito } = useSWR(isEditMode ? ['credito', idParaEditar] : null, () => getCreditoById(idParaEditar));

  useEffect(() => {
    if (dadosCredito) {
      setFormData({ 
        ...dadosCredito, 
        data_inicio: dadosCredito.data_lancamento?.split('T')[0] || '',
        // Para edição, assumimos que data_fim não é salva no historico simples, apenas para novos periodos
      });
    }
  }, [dadosCredito]);

  // Cálculo automático de dias
  useEffect(() => {
    if (formData.unidade === 'dias' && formData.data_inicio && formData.data_fim) {
      const diff = differenceInDays(parseISO(formData.data_fim), parseISO(formData.data_inicio)) + 1; // +1 para contar o dia final
      if (diff > 0) {
        setFormData(prev => ({ ...prev, quantidade: diff }));
      }
    }
  }, [formData.data_inicio, formData.data_fim, formData.unidade]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.funcionario_id || !formData.tipo || !formData.quantidade || !formData.data_inicio) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = { ...formData, quantidade: parseFloat(formData.quantidade) };
      
      // A função createCreditoSaldo agora sabe lidar com Férias (Periodos) vs Banco
      const promise = isEditMode ? updateCredito(idParaEditar, payload) : createCreditoSaldo(payload);
      
      await toast.promise(promise, {
        loading: 'Processando...',
        success: `Lançamento realizado com sucesso!`,
        error: (e) => `Erro: ${e.message}`
      });
      
      mutate('getHistoricoCreditos');
      mutate('getSaldosConsolidados'); // Atualiza o Painel de Saldos!
      onClose();
    } catch (err) { setIsSubmitting(false); }
  };

  const isFerias = formData.tipo === 'Férias';

  return (
    <div className="ausencia-form-container">
      {isSubmitting && <div className="form-loading-overlay"><div className="form-spinner"></div></div>}
      
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', height:'100%'}}>
        <div className="ausencia-form-content">
          <div className="ausencia-form-grid">
            
            <div className="form-section-title">Colaborador</div>
            <div className="ausencia-form-group ausencia-form-span-2">
              <label>Selecione o Funcionário *</label>
              <select name="funcionario_id" value={formData.funcionario_id} onChange={handleChange} disabled={isEditMode || loadingFunc} required>
                <option value="">{loadingFunc ? 'Carregando...' : 'Selecione...'}</option>
                {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
              </select>
            </div>

            <div className="form-section-title">Dados do Crédito</div>
            <div className="ausencia-form-group">
              <label>Tipo de Lançamento *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                <option value="">Selecione...</option>
                <option value="Férias">Período Aquisitivo (Férias)</option>
                <option value="Banco de Horas">Crédito de Banco de Horas</option>
                <option value="Folga">Crédito de Folga Extra</option>
              </select>
            </div>

            <div className="ausencia-form-group">
              <label>Unidade</label>
              <select name="unidade" value={formData.unidade} onChange={handleChange} required>
                <option value="dias">Dias</option>
                <option value="horas">Horas</option>
              </select>
            </div>

            <div className="form-section-title">
              {isFerias ? 'Período Aquisitivo' : 'Período/Data de Referência'}
            </div>

            <div className="ausencia-form-group">
              <label>Data Inicial *</label>
              <input type="date" name="data_inicio" value={formData.data_inicio} onChange={handleChange} required />
            </div>

            {/* Campo Data Fim (Crucial para Férias) */}
            <div className="ausencia-form-group">
              <label>Data Final {isFerias ? '*' : '(Opcional)'}</label>
              <input type="date" name="data_fim" value={formData.data_fim} onChange={handleChange} required={isFerias} />
            </div>

            {/* Campo Quantidade (Calculado ou Manual) */}
            <div className="ausencia-form-group">
              <label>Quantidade Total ({formData.unidade}) *</label>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">calculate</span>
                <input type="number" name="quantidade" step="0.1" value={formData.quantidade} onChange={handleChange} required />
              </div>
            </div>

            {/* Campo Extra para Férias: Limite Concessivo */}
            {isFerias && (
              <div className="ausencia-form-group">
                <label title="Data limite para o funcionário tirar essas férias">Limite Concessivo (Opcional)</label>
                <input type="date" name="data_limite" value={formData.data_limite} onChange={handleChange} />
              </div>
            )}

            <div className="ausencia-form-group ausencia-form-span-2">
              <label>Justificativa</label>
              <textarea name="motivo" rows="2" placeholder="Ex: Período 2023/2024" value={formData.motivo || ''} onChange={handleChange}></textarea>
            </div>

          </div>
        </div>

        <div className="ausencia-form-footer">
          <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
          <button type="submit" className="button-primary" disabled={isSubmitting}>
            <span className="material-symbols-outlined">save</span> Salvar Lançamento
          </button>
        </div>
      </form>
    </div>
  );
}

export default LancarCreditoForm;