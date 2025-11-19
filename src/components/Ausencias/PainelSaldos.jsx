// src/components/Ausencias/PainelSaldos.jsx

import React, { useState } from 'react';
import useSWR from 'swr';
import { getFuncionarios, getAvatarPublicUrl } from '../../services/funcionarioService';
import { getHistoricoAusencias, getHistoricoCreditos } from '../../services/ausenciaService';
import SaldoCard from './SaldoCard';
import './PainelSaldos.css';
import ModalAjusteSaldo from '../Modal/ModalAjusteSaldo';
import ModalExtrato from '../Modal/ModalExtrato'; // <-- NOVO IMPORT

// --- Função de Cálculo Dinâmico (Mantida) ---
const calcularSaldos = (funcId, historicoCreditos, historicoAusencias) => {
  const dynamicBalances = {};

  historicoCreditos
    .filter(c => c.funcionario_id === funcId)
    .forEach(credito => {
      const tipo = credito.tipo;
      dynamicBalances[tipo] = (dynamicBalances[tipo] || 0) + credito.quantidade;
    });
    
  historicoAusencias
    .filter(d => 
      d.funcionario_id === funcId && 
      (d.status === 'Aprovado' || d.status === 'Concluído') // <-- AGORA INCLUI 'CONCLUÍDO'
    ) 
    .forEach(debito => {
      const tipo = debito.tipo;
      if (dynamicBalances.hasOwnProperty(tipo)) {
        if (tipo.toLowerCase().includes('férias') || tipo.toLowerCase().includes('licença')) {
          const dataInicio = new Date(debito.data_inicio.replace(/-/g, '/'));
          const dataFim = new Date(debito.data_fim.replace(/-/g, '/'));
          const diffTime = Math.abs(dataFim - dataInicio);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          
          dynamicBalances[tipo] -= diffDays;
        } 
      }
    });
    
  return dynamicBalances;
};


function PainelSaldos() {
  const [modalState, setModalState] = useState({ isOpen: false, funcionario: null });
  // Novo estado para o Extrato
  const [extratoModal, setExtratoModal] = useState({ isOpen: false, funcionario: null });

  const { data: funcionarios, error: errorFunc, isLoading: isLoadingFunc } = useSWR('getFuncionarios', getFuncionarios);
  const { data: creditos, error: errorCred, isLoading: isLoadingCred } = useSWR('getHistoricoCreditos', getHistoricoCreditos);
  const { data: ausencias, error: errorAus, isLoading: isLoadingAus } = useSWR('getHistoricoAusencias', getHistoricoAusencias);


  // Handlers
  const handleAjustarSaldo = (funcionario) => { setModalState({ isOpen: true, funcionario: funcionario }); };
  const handleCloseModal = () => { setModalState({ isOpen: false, funcionario: null }); };
  
  // Handler para abrir o Extrato
  const handleVerExtrato = (funcionario) => {
    setExtratoModal({ isOpen: true, funcionario });
  };
  const handleCloseExtrato = () => {
    setExtratoModal({ isOpen: false, funcionario: null });
  };

  const isLoading = isLoadingFunc || isLoadingCred || isLoadingAus;
  const error = errorFunc || errorCred || errorAus;
  
  if (isLoading) return <p>Calculando saldos...</p>;
  if (error) return <p className="error-message">Falha ao carregar dados.</p>;
  if (!funcionarios || funcionarios.length === 0) {
    return <div className="historico-empty"><p>Nenhum funcionário encontrado.</p></div>;
  }

  return (
    <div className="painel-saldos-container">
      
      <div className="saldos-grid">
        {funcionarios.map((func) => {
          const saldosCalculados = calcularSaldos(func.id, creditos, ausencias);
          
          const debitosAprovados = ausencias
            .filter(d => d.funcionario_id === func.id && (d.status === 'Aprovado' || d.status === 'Concluído'))
            .slice(0, 3);

          return (
            <SaldoCard 
              key={func.id}
              funcionario={func}
              saldos={saldosCalculados}
              ultimosDebitos={debitosAprovados}
              getAvatarUrl={getAvatarPublicUrl}
              // Passa as funções de ação
              onAjustar={handleAjustarSaldo} 
              onVerExtrato={handleVerExtrato} // <-- Nova Prop
            />
          );
        })}
      </div>

      {/* Modal de Lançamento */}
      <ModalAjusteSaldo
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        funcionario={modalState.funcionario}
      />

      {/* Novo Modal de Extrato */}
      <ModalExtrato 
        isOpen={extratoModal.isOpen}
        onClose={handleCloseExtrato}
        funcionario={extratoModal.funcionario}
      />
    </div>
  );
}

export default PainelSaldos;