import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';

import './LancarAusenciaForm.css'; // REUTILIZANDO o CSS

import { getFuncionarios } from '../../services/funcionarioService';
import { 
  createCreditoSaldo,
  getCreditoById,   // Novo
  updateCredito     // Novo
} from '../../services/ausenciaService';

const initialState = {
  funcionario_id: '',
  tipo: '',
  quantidade: '',
  unidade: 'dias',
  motivo: '',
  data_lancamento: new Date().toISOString().split('T')[0],
};

// --- O QUE MUDOU: ---
// 1. O formulário agora aceita 'idParaEditar' e 'onClose'
// 2. Ele usa 'useSWR' para buscar os dados do crédito se estiver em modo de edição
// 3. O 'handleSubmit' agora sabe a diferença entre 'criar' e 'atualizar'

function LancarCreditoForm({ idParaEditar = null, onClose }) {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWRConfig();
  const isEditMode = Boolean(idParaEditar);

  // --- BUSCA 1: Lista de funcionários ---
  const {
    data: funcionarios,
    error: errorFuncionarios,
    isLoading: isLoadingFuncionarios
  } = useSWR('getFuncionarios', getFuncionarios, {
    revalidateOnFocus: false
  });

  // --- BUSCA 2: Dados do crédito (se estiver em modo de edição) ---
  const { 
    data: dadosCredito, 
    error: fetchError, 
    isLoading: isFetching 
  } = useSWR(
    isEditMode ? ['credito', idParaEditar] : null, 
    () => getCreditoById(idParaEditar)
  );

  // Efeito para preencher o formulário
  useEffect(() => {
    if (dadosCredito) {
      const formattedData = {
        ...dadosCredito,
        data_lancamento: dadosCredito.data_lancamento ? dadosCredito.data_lancamento.split('T')[0] : '',
      };
      setFormData(formattedData);
    }
  }, [dadosCredito]);

  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --- ATUALIZAÇÃO PRINCIPAL: LÓGICA DE SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.funcionario_id || !formData.tipo || !formData.quantidade || !formData.unidade) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    const dadosParaSalvar = {
      ...formData,
      quantidade: parseFloat(formData.quantidade),
    };

    let promise;

    if (isEditMode) {
      // --- MODO DE ATUALIZAÇÃO ---
      promise = updateCredito(idParaEditar, dadosParaSalvar);
    } else {
      // --- MODO DE CRIAÇÃO ---
      promise = createCreditoSaldo(dadosParaSalvar);
    }

    // Usamos o toast.promise para ambos os casos
    toast.promise(promise, {
      loading: 'Salvando...',
      success: () => {
        setIsSubmitting(false);
        // Invalida o cache. O mural (Fase 2) vai atualizar.
        mutate('getHistoricoCreditos'); 
        onClose(); // Fecha o modal
        return `Crédito ${isEditMode ? 'atualizado' : 'lançado'} com sucesso!`;
      },
      error: (err) => {
        setIsSubmitting(false);
        return `Erro ao salvar: ${err.message}`;
      },
    });
  };

  // --- LÓGICA DE LOADING E ERRO DA BUSCA ---
  if (isFetching) return <p>Carregando dados do crédito...</p>;
  if (fetchError) return <p className="error-message">Falha ao carregar: {fetchError.message}</p>;

  return (
    // Reutilizamos as classes CSS do formulário de ausência
    <div className="ausencia-form-container" style={{border: 'none', boxShadow: 'none'}}>
      <form onSubmit={handleSubmit}>
        <div className="ausencia-form-content" style={{padding: '0'}}>
          <div className="ausencia-form-grid">

            {/* --- Colaborador --- */}
            <div className="ausencia-form-group ausencia-form-span-2">
              <label htmlFor="credito-employee">Colaborador *</label>
              <select
                id="credito-employee"
                name="funcionario_id"
                value={formData.funcionario_id}
                onChange={handleChange}
                disabled={isLoadingFuncionarios || !!errorFuncionarios || isEditMode}
                required
              >
                <option value="">
                  {errorFuncionarios ? 'Erro ao carregar...' : (isLoadingFuncionarios ? 'Carregando...' : 'Selecione um colaborador')}
                </option>
                {funcionarios && funcionarios.map((func) => (
                  <option key={func.id} value={func.id}>
                    {func.nome_completo}
                  </option>
                ))}
              </select>
            </div>

            {/* --- Tipo de Crédito --- */}
            <div className="ausencia-form-group">
              <label htmlFor="credito-tipo">Tipo de Crédito *</label>
              <select
                id="credito-tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
              >
                <option value="">Escolha o tipo</option>
                <option value="Férias">Férias</option>
                <option value="Banco de Horas">Banco de Horas</option>
                <option value="Folga Sindicato">Folga Sindicato</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* --- Quantidade --- */}
            <div className="ausencia-form-group">
              <label htmlFor="credito-quantidade">Quantidade *</label>
              <input
                id="credito-quantidade"
                name="quantidade"
                type="number"
                step="0.01"
                placeholder="Ex: 30 (dias) ou 8.5 (horas)"
                value={formData.quantidade}
                onChange={handleChange}
                required
              />
            </div>

            {/* --- Unidade --- */}
            <div className="ausencia-form-group">
              <label htmlFor="credito-unidade">Unidade *</label>
              <select
                id="credito-unidade"
                name="unidade"
                value={formData.unidade}
                onChange={handleChange}
                required
              >
                <option value="dias">Dias</option>
                <option value="horas">Horas</option>
              </select>
            </div>

            {/* --- Data do Lançamento --- */}
            <div className="ausencia-form-group">
              <label htmlFor="credito-data">Data do Lançamento *</label>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">calendar_today</span>
                <input
                  id="credito-data"
                  name="data_lancamento"
                  type="date"
                  value={formData.data_lancamento}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* --- Motivo/Observações --- */}
            <div className="ausencia-form-group ausencia-form-span-2">
              <label htmlFor="credito-motivo">Motivo / Observações</label>
              <textarea
                id="credito-motivo"
                name="motivo"
                placeholder="Ex: Período aquisitivo 2024/2025..."
                rows="3"
                value={formData.motivo || ''} // Garante que não seja 'null'
                onChange={handleChange}
              ></textarea>
            </div>
            
          </div>
        </div>

        {/* --- Botões de Ação --- */}
        <div className="ausencia-form-footer">
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={isSubmitting}
          >
            <span className="material-symbols-outlined button-icon">save</span>
            {isSubmitting ? 'Salvando...' : (isEditMode ? 'Atualizar Crédito' : 'Lançar Crédito')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LancarCreditoForm;