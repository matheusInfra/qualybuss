import React, { useState, useEffect } from 'react';
import { createMovimentacao } from '../../services/movimentacaoService';
import { toast } from 'react-hot-toast';
import './ModalReajusteIndividual.css'; // Criaremos abaixo

export default function ModalReajusteIndividual({ funcionario, isOpen, onClose, onSuccess }) {
  const [novoSalario, setNovoSalario] = useState('');
  const [motivo, setMotivo] = useState('');
  const [dataVigencia, setDataVigencia] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Reset ao abrir
  useEffect(() => {
    if (isOpen && funcionario) {
      setNovoSalario(funcionario.salario_bruto || '');
      setMotivo('');
      setLoading(false);
    }
  }, [isOpen, funcionario]);

  if (!isOpen || !funcionario) return null;

  // Cálculos de Impacto em Tempo Real
  const atual = parseFloat(funcionario.salario_bruto || 0);
  const novo = parseFloat(novoSalario || 0);
  const diferenca = novo - atual;
  const percentual = atual > 0 ? ((diferenca / atual) * 100).toFixed(2) : 0;
  
  // Estimativa de Encargos (Simples: +36.8%)
  const custoExtra = diferenca * 1.368;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!novo || !motivo) {
      toast.error("Informe o novo salário e o motivo.");
      return;
    }

    if (novo < atual) {
        if (!window.confirm("⚠️ ATENÇÃO: Redução Salarial detectada. Isso pode gerar passivo trabalhista. Continuar?")) return;
    }

    setLoading(true);
    try {
      await createMovimentacao({
        id_funcionario: funcionario.id,
        tipo: diferenca > 0 ? 'Aumento Salarial' : 'Reclassificação',
        data_movimentacao: dataVigencia,
        descricao: motivo,
        salario_novo: novo,
        // Mantém os outros dados
        cargo_novo: funcionario.cargo,
        departamento_novo: funcionario.departamento,
        empresa_nova: funcionario.empresa_id
      });

      toast.success("Salário atualizado com sucesso!");
      onSuccess(); // Recarrega a tabela pai
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content-reajuste">
        <div className="modal-header">
          <h3>Reajuste Salarial Individual</h3>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="funcionario-summary">
          <div className="avatar-mini">
            {funcionario.nome_completo.charAt(0)}
          </div>
          <div>
            <strong>{funcionario.nome_completo}</strong>
            <p>{funcionario.cargo}</p>
          </div>
          <div className="salario-atual-badge">
            Atual: R$ {atual.toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="reajuste-form">
          <div className="form-row">
            <div className="form-group">
              <label>Novo Salário (R$)</label>
              <input 
                type="number" 
                step="0.01" 
                value={novoSalario} 
                onChange={(e) => setNovoSalario(e.target.value)}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Vigência</label>
              <input 
                type="date" 
                value={dataVigencia} 
                onChange={(e) => setDataVigencia(e.target.value)}
              />
            </div>
          </div>

          {/* Card de Impacto */}
          {diferenca !== 0 && (
            <div className={`impacto-card ${diferenca > 0 ? 'positivo' : 'negativo'}`}>
              <div className="impacto-item">
                <span>Diferença</span>
                <strong>{diferenca > 0 ? '+' : ''} R$ {diferenca.toLocaleString()}</strong>
              </div>
              <div className="impacto-item">
                <span>% Ajuste</span>
                <strong>{percentual}%</strong>
              </div>
              <div className="impacto-item">
                <span>Custo Extra (Est.)</span>
                <strong>R$ {custoExtra.toLocaleString()}</strong>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Motivo / Justificativa *</label>
            <input 
              type="text" 
              placeholder="Ex: Promoção por mérito, Dissídio..." 
              value={motivo} 
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading || diferenca === 0}>
              {loading ? 'Processando...' : 'Confirmar Reajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}