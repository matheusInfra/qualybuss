import React, { useState } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { createCreditoSaldo, createAusencia } from '../../services/ausenciaService';
import './ModalAjusteSaldo.css';

const initialState = {
  tipoAjuste: 'credito', // 'credito' ou 'debito'
  tipoSaldo: 'Férias', // 'Férias' ou 'Banco de Horas'
  quantidade: '',
  motivo: 'Ajuste manual de saldo',
};

function ModalAjusteSaldo({ isOpen, onClose, funcionario }) {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWRConfig();

  // Resetar o form ao fechar/abrir
  React.useEffect(() => {
    if (isOpen) {
      setFormData(initialState);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTipoAjuste = (tipo) => {
    setFormData(prev => ({ ...prev, tipoAjuste: tipo }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const { tipoAjuste, tipoSaldo, quantidade, motivo } = formData;
    const funcId = funcionario.id;

    try {
      if (tipoAjuste === 'credito') {
        // --- CHAMA O SERVICE DE CRÉDITO ---
        const dadosCredito = {
          funcionario_id: funcId,
          tipo: tipoSaldo,
          quantidade: parseFloat(quantidade),
          unidade: tipoSaldo === 'Férias' ? 'dias' : 'horas',
          motivo: motivo,
          data_lancamento: new Date().toISOString().split('T')[0],
        };
        await createCreditoSaldo(dadosCredito);
      
      } else {
        // --- CHAMA O SERVICE DE DÉBITO (AUSÊNCIA) ---
        // Para débito de "dias", criamos uma ausência de X dias a partir de hoje
        const hoje = new Date();
        const dataFim = new Date(hoje);
        if (tipoSaldo === 'Férias') {
          // Subtrai 1 pois o cálculo de dias de ausência é inclusivo
          dataFim.setDate(hoje.getDate() + (parseInt(quantidade) - 1));
        }
        
        const dadosDebito = {
          funcionario_id: funcId,
          tipo: tipoSaldo, // "Férias" ou "Banco de Horas"
          motivo: motivo,
          data_inicio: hoje.toISOString().split('T')[0],
          data_fim: dataFim.toISOString().split('T')[0],
          // (Para banco de horas, o ideal seria ter um campo "horas" na tabela 'solicitacoes_ausencia')
          // (Por enquanto, um débito de "Banco de Horas" apenas registra a intenção)
        };
        await createAusencia(dadosDebito);
      }
      
      // Sucesso
      toast.success('Saldo ajustado com sucesso!');
      
      // Atualiza os dois históricos (crédito e débito)
      // O GestaoSaldos.jsx vai recalcular automaticamente
      mutate('getHistoricoCreditos');
      mutate('getHistoricoAusencias');
      
      setIsSubmitting(false);
      onClose(); // Fecha o modal

    } catch (err) {
      toast.error(`Erro ao ajustar: ${err.message}`);
      setIsSubmitting(false);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-ajuste" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header-ajuste">
          <h2 className="modal-title-ajuste">Ajustar Saldo</h2>
          <p className="modal-subtitle-ajuste">
            Ajustando saldo de: <strong>{funcionario?.nome_completo}</strong>
          </p>
        </div>

        <div className="modal-body-ajuste">
          {/* Toggle Crédito/Débito */}
          <div className="tipo-ajuste-toggle">
            <button
              onClick={() => handleTipoAjuste('credito')}
              className={formData.tipoAjuste === 'credito' ? 'active credito' : ''}
            >
              Adicionar (Crédito)
            </button>
            <button
              onClick={() => handleTipoAjuste('debito')}
              className={formData.tipoAjuste === 'debito' ? 'active debito' : ''}
            >
              Remover (Débito)
            </button>
          </div>

          <div className="ajuste-form-grid">
            {/* Tipo de Saldo */}
            <div className="ajuste-form-group">
              <label htmlFor="tipoSaldo">Tipo de Saldo</label>
              <select name="tipoSaldo" value={formData.tipoSaldo} onChange={handleChange}>
                <option value="Férias">Férias</option>
                <option value="Banco de Horas">Banco de Horas</option>
              </select>
            </div>
            
            {/* Quantidade */}
            <div className="ajuste-form-group">
              <label htmlFor="quantidade">
                Quantidade ({formData.tipoSaldo === 'Férias' ? 'dias' : 'horas'})
              </label>
              <input
                type="number"
                name="quantidade"
                step="0.1"
                value={formData.quantidade}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Motivo */}
          <div className="ajuste-form-group">
            <label htmlFor="motivo">Motivo do Ajuste</label>
            <input
              type="text"
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
            />
          </div>
          
          {/* Aviso para débito de férias */}
          {formData.tipoAjuste === 'debito' && formData.tipoSaldo === 'Férias' && (
            <p style={{fontSize: '12px', color: '#777', margin: 0}}>
              * O débito de dias de férias será lançado como uma ausência 
              de {formData.quantidade || 0} dias corridos a partir de hoje.
            </p>
          )}

        </div>

        <div className="modal-footer-ajuste">
          <button onClick={onClose} className="modal-button-secondary">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit} 
            className="modal-button-primary"
            disabled={isSubmitting || !formData.quantidade}
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar Ajuste'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default ModalAjusteSaldo;