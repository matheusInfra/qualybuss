// src/components/Modal/ModalExtrato.jsx
import React, { useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { 
  getHistoricoAusencias, 
  getHistoricoCreditos, 
  concluirSolicitacao 
} from '../../services/ausenciaService';
import './ModalExtrato.css'; 

const formatData = (dataStr) => {
  if (!dataStr) return '-';
  return new Date(dataStr.split('T')[0].replace(/-/g, '/')).toLocaleDateString('pt-BR');
};

function ModalExtrato({ isOpen, onClose, funcionario }) {
  const { mutate } = useSWRConfig();
  const [isProcessing, setIsProcessing] = useState(false);

  // Busca dados frescos
  const { data: creditos } = useSWR('getHistoricoCreditos', getHistoricoCreditos);
  const { data: debitos } = useSWR('getHistoricoAusencias', getHistoricoAusencias);

  const extrato = useMemo(() => {
    if (!creditos || !debitos || !funcionario) return [];

    const lista = [];

    // 1. Créditos
    creditos
      .filter(c => c.funcionario_id === funcionario.id)
      .forEach(c => {
        lista.push({
          id: c.id,
          data: c.data_lancamento, 
          tipo: c.tipo,
          descricao: 'Crédito / Ajuste',
          entrada: c.quantidade,
          saida: 0,
          unidade: c.unidade,
          status: 'Concluído', 
          origem: 'creditos_saldo'
        });
      });

    // 2. Débitos (SÓ APROVADOS OU CONCLUÍDOS)
    debitos
      .filter(d => d.funcionario_id === funcionario.id && (d.status === 'Aprovado' || d.status === 'Concluído'))
      .forEach(d => {
        let qtd = 0;
        let unidade = 'dias';
        
        if (d.tipo.toLowerCase().includes('férias') || d.tipo.toLowerCase().includes('licença')) {
            const inicio = new Date(d.data_inicio);
            const fim = new Date(d.data_fim);
            const diff = Math.abs(fim - inicio);
            qtd = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
        }

        lista.push({
          id: d.id,
          data: d.data_inicio,
          tipo: d.tipo,
          descricao: d.motivo || 'Ausência agendada',
          entrada: 0,
          saida: qtd,
          unidade: unidade,
          status: d.status,
          origem: 'solicitacoes_ausencia'
        });
      });

    // 3. Ordena
    lista.sort((a, b) => new Date(a.data) - new Date(b.data));

    // 4. Calcula Saldo
    let saldoAcumulado = 0;
    return lista.map(item => {
      if (item.unidade === 'dias') {
        saldoAcumulado = saldoAcumulado + item.entrada - item.saida;
      }
      return { ...item, saldoApos: saldoAcumulado };
    });

  }, [creditos, debitos, funcionario]);


  // --- AÇÃO DE "DAR BAIXA" ---
  const handleBaixa = async (item) => {
    if (!window.confirm(`ATENÇÃO: Confirmar a baixa de "${item.tipo}"?\n\nIsso confirma que a folga foi realizada e trava o registro contra edições.`)) return;
    
    setIsProcessing(true);
    try {
      await concluirSolicitacao(item.id, item.origem);
      
      // Atualiza os caches para que o Mural (na outra tela) mostre o cadeado
      mutate('getHistoricoAusencias');
      
      toast.success('Registro baixado e arquivado com sucesso.');
    } catch (err) {
      toast.error('Erro ao dar baixa: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !funcionario) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-extrato" onClick={e => e.stopPropagation()}>
        
        <div className="extrato-header">
          <div>
            <h2>Extrato de Férias e Folgas</h2>
            <p className="extrato-subtitle">{funcionario.nome_completo} — {funcionario.cargo}</p>
          </div>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="extrato-body">
          <table className="extrato-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Histórico</th>
                <th className="text-right">Entrada</th>
                <th className="text-right">Saída</th>
                <th className="text-right">Saldo</th>
                <th className="text-center">Status</th>
                <th className="text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {extrato.length === 0 ? (
                <tr><td colSpan="7" className="text-center" style={{padding: '40px'}}>Nenhum registro encontrado.</td></tr>
              ) : (
                extrato.map((item, idx) => (
                  <tr key={`${item.id}-${idx}`} className={item.status === 'Concluído' ? 'row-locked' : ''}>
                    <td>{formatData(item.data)}</td>
                    <td>
                      <div className="extrato-desc">
                        <strong>{item.tipo}</strong>
                        <span>{item.descricao}</span>
                      </div>
                    </td>
                    <td className="text-right text-green">
                      {item.entrada > 0 ? `+${item.entrada}` : '-'}
                    </td>
                    <td className="text-right text-red">
                      {item.saida > 0 ? `-${item.saida}` : '-'}
                    </td>
                    <td className="text-right font-bold">
                      {item.unidade === 'dias' ? item.saldoApos.toFixed(1) : '-'}
                    </td>
                    <td className="text-center">
                       <span className={`status-badge ${item.status.toLowerCase()}`}>
                         {item.status}
                       </span>
                    </td>
                    <td className="text-center">
                      {/* BOTÃO DE BAIXA: Só aparece se for SAÍDA e APROVADO */}
                      {item.status === 'Aprovado' && item.saida > 0 && (
                        <button 
                          className="btn-baixa"
                          onClick={() => handleBaixa(item)}
                          disabled={isProcessing}
                          title="DAR BAIXA: Efetivar e Travar registro"
                        >
                          <span className="material-symbols-outlined">check_circle</span>
                          <span className="btn-text">Dar Baixa</span>
                        </button>
                      )}
                      {item.status === 'Concluído' && (
                        <span className="material-symbols-outlined icon-locked" title="Registro Bloqueado (Auditado)">lock</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="extrato-footer">
            <p className="info-audit">
              <span className="material-symbols-outlined" style={{fontSize: '14px', verticalAlign: 'middle'}}>info</span> Registros "Concluídos" são imutáveis e auditados.
            </p>
        </div>

      </div>
    </div>
  );
}

export default ModalExtrato;