import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionarios } from '../../services/funcionarioService';
import { getPeriodosAquisitivos, updatePeriodoAquisitivo } from '../../services/ausenciaService';

function GerenciarPeriodos({ onClose }) {
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  useEffect(() => {
    if (selectedFuncionario) {
      setLoading(true);
      getPeriodosAquisitivos(selectedFuncionario)
        .then(setPeriodos)
        .finally(() => setLoading(false));
    } else {
      setPeriodos([]);
    }
  }, [selectedFuncionario]);

  const handleUpdate = async (id, diasAtuais) => {
    const novo = prompt("Dias já gozados neste período:", diasAtuais);
    if (novo === null) return;
    try {
      const dias = parseInt(novo);
      await updatePeriodoAquisitivo(id, { dias_gozados: dias, status: dias >= 30 ? 'Fechado' : 'Aberto' });
      toast.success("Saldo atualizado!");
      setPeriodos(await getPeriodosAquisitivos(selectedFuncionario));
    } catch (e) { toast.error("Erro ao atualizar."); }
  };

  return (
    <div>
      <div style={{marginBottom: '20px'}}>
        <label style={{fontWeight: 600, display: 'block', marginBottom: '8px'}}>Colaborador:</label>
        <select 
          style={{width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px'}}
          onChange={e => setSelectedFuncionario(e.target.value)}
        >
          <option value="">Selecione...</option>
          {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
        </select>
      </div>

      {loading && <p>Carregando...</p>}
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
        {periodos.map(p => (
          <div key={p.id} style={{padding: '12px', border: '1px solid #eee', borderRadius: '8px', background: p.status === 'Fechado' ? '#f9fafb' : '#fff'}}>
            <div style={{fontWeight: 600, marginBottom: '4px'}}>
              {new Date(p.inicio_periodo).getFullYear()} - {new Date(p.fim_periodo).getFullYear()}
            </div>
            <div style={{fontSize: '0.9rem', color: '#666', marginBottom: '8px'}}>
              Direito: {p.dias_direito} | Gozados: {p.dias_gozados} | <strong>Saldo: {p.saldo_atual}</strong>
            </div>
            {p.status === 'Aberto' && (
              <button onClick={() => handleUpdate(p.id, p.dias_gozados)} style={{padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer'}}>
                Ajustar Manualmente
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div style={{marginTop: '20px', textAlign: 'right'}}>
        <button onClick={onClose} style={{padding: '8px 16px', cursor: 'pointer'}}>Fechar</button>
      </div>
    </div>
  );
}

export default GerenciarPeriodos;