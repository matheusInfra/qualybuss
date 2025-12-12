import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { desligarFuncionario } from '../../services/funcionarioService';
import { useSWRConfig } from 'swr';
import './ModalSolicitarAjuste.css'; // Reutiliza CSS de modal existente

function ModalDesligamento({ funcionario, onClose }) {
  const [loading, setLoading] = useState(false);
  const [motivo, setMotivo] = useState('Sem Justa Causa');
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().split('T')[0]);
  const [confirmacao, setConfirmacao] = useState('');
  const { mutate } = useSWRConfig();

  const handleDesligar = async () => {
    if (confirmacao !== 'DESLIGAR') {
      return toast.error("Digite DESLIGAR para confirmar.");
    }

    setLoading(true);
    try {
      await desligarFuncionario(funcionario.id, {
        data_desligamento: dataSaida,
        motivo: motivo
      });

      toast.success(`${funcionario.nome_completo} foi desligado(a) com sucesso.`);
      mutate('getFuncionarios'); // Atualiza lista
      mutate('dashboard_kpis'); // Atualiza dashboard (menos 1 ativo)
      onClose();
    } catch (error) {
      toast.error("Erro ao processar desligamento: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{maxWidth: '450px'}}>
        <div className="modal-header" style={{borderBottom: '1px solid #fee2e2'}}>
          <h3 style={{color: '#b91c1c'}}>🚫 Desligamento de Colaborador</h3>
          <button onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div style={{background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #fecaca'}}>
            <p style={{color: '#991b1b', fontSize: '0.9rem', margin: 0}}>
              Você está prestes a desligar <strong>{funcionario.nome_completo}</strong>. 
              O acesso ao sistema será revogado e o status passará para "Inativo".
            </p>
          </div>

          <div className="form-group">
            <label>Data do Desligamento</label>
            <input 
              type="date" 
              value={dataSaida} 
              onChange={(e) => setDataSaida(e.target.value)} 
              style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
            />
          </div>

          <div className="form-group" style={{marginTop: '12px'}}>
            <label>Motivo da Saída</label>
            <select 
              value={motivo} 
              onChange={(e) => setMotivo(e.target.value)}
              style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
            >
              <option>Sem Justa Causa</option>
              <option>Pedido de Demissão</option>
              <option>Com Justa Causa</option>
              <option>Término de Contrato</option>
              <option>Acordo</option>
            </select>
          </div>

          <div className="form-group" style={{marginTop: '20px'}}>
             <label style={{fontSize: '0.8rem', color: '#666'}}>Confirmação de Segurança</label>
             <input 
               type="text" 
               placeholder="Digite DESLIGAR"
               value={confirmacao}
               onChange={(e) => setConfirmacao(e.target.value.toUpperCase())}
               style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #b91c1c', fontWeight: 'bold'}}
             />
          </div>

          <div style={{display: 'flex', gap: '10px', marginTop: '24px'}}>
            <button 
              onClick={onClose} 
              style={{flex: 1, padding: '10px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer'}}
            >
              Cancelar
            </button>
            <button 
              onClick={handleDesligar}
              disabled={loading || confirmacao !== 'DESLIGAR'}
              style={{
                flex: 1, padding: '10px', border: 'none', background: '#dc2626', color: 'white', 
                borderRadius: '6px', cursor: 'pointer', opacity: confirmacao !== 'DESLIGAR' ? 0.5 : 1
              }}
            >
              {loading ? 'Processando...' : 'Confirmar Desligamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalDesligamento;