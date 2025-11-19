import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { getSaldosConsolidados } from '../../services/saldoService'; // Novo Service
import { getAvatarPublicUrl } from '../../services/funcionarioService';
import { getHistoricoAusencias } from '../../services/ausenciaService'; // Ainda usamos para ver os últimos débitos
import SaldoCard from './SaldoCard';
import './PainelSaldos.css';
import ModalAjusteSaldo from '../Modal/ModalAjusteSaldo';
import ModalExtrato from '../Modal/ModalExtrato';

function PainelSaldos() {
  const [modalState, setModalState] = useState({ isOpen: false, funcionario: null });
  const [extratoModal, setExtratoModal] = useState({ isOpen: false, funcionario: null });

  // 1. Busca os saldos já prontos da nossa View SQL
  const { 
    data: dadosView, 
    error: errorSaldos, 
    isLoading: isLoadingSaldos 
  } = useSWR('getSaldosConsolidados', getSaldosConsolidados);

  // 2. Ainda buscamos ausências para mostrar a lista de "Últimos Débitos" no card
  // (Idealmente, isso também viria de uma query otimizada no futuro)
  const { data: ausencias } = useSWR('getHistoricoAusencias', getHistoricoAusencias);

  // 3. Transformação dos dados da View para o formato que o SaldoCard espera
  // A View retorna linhas soltas (João - Férias, João - Banco de Horas).
  // Precisamos agrupar por funcionário.
  const funcionariosAgrupados = useMemo(() => {
    if (!dadosView) return [];

    const map = new Map();

    dadosView.forEach(row => {
      if (!row.tipo_saldo) return; // Ignora se não tiver saldo nenhum

      if (!map.has(row.funcionario_id)) {
        map.set(row.funcionario_id, {
          id: row.funcionario_id,
          nome_completo: row.nome_completo,
          cargo: row.cargo,
          avatar_url: row.avatar_url,
          saldos: {}
        });
      }
      
      const func = map.get(row.funcionario_id);
      func.saldos[row.tipo_saldo] = row.saldo_final;
    });

    return Array.from(map.values());
  }, [dadosView]);

  // Handlers de Modal (iguais ao original)
  const handleAjustarSaldo = (funcionario) => setModalState({ isOpen: true, funcionario });
  const handleCloseModal = () => setModalState({ isOpen: false, funcionario: null });
  const handleVerExtrato = (funcionario) => setExtratoModal({ isOpen: true, funcionario });
  const handleCloseExtrato = () => setExtratoModal({ isOpen: false, funcionario: null });

  if (isLoadingSaldos) return <div className="painel-loading"><p>Carregando saldos...</p></div>;
  if (errorSaldos) return <p className="error-message">Falha ao carregar saldos.</p>;

  return (
    <div className="painel-saldos-container">
      <div className="saldos-grid">
        {funcionariosAgrupados.map((func) => {
          // Filtra os últimos débitos para este funcionário (apenas visual)
          const debitosAprovados = ausencias
            ? ausencias
                .filter(d => d.funcionario_id === func.id && (d.status === 'Aprovado' || d.status === 'Concluído'))
                .slice(0, 3)
            : [];

          return (
            <SaldoCard 
              key={func.id}
              funcionario={func}
              saldos={func.saldos}
              ultimosDebitos={debitosAprovados}
              getAvatarUrl={getAvatarPublicUrl}
              onAjustar={handleAjustarSaldo} 
              onVerExtrato={handleVerExtrato}
            />
          );
        })}
        
        {funcionariosAgrupados.length === 0 && (
           <p style={{gridColumn: '1/-1', textAlign: 'center', color: '#666'}}>
             Nenhum saldo calculado ainda. Faça um lançamento para começar.
           </p>
        )}
      </div>

      <ModalAjusteSaldo
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        funcionario={modalState.funcionario}
      />

      <ModalExtrato 
        isOpen={extratoModal.isOpen}
        onClose={handleCloseExtrato}
        funcionario={extratoModal.funcionario}
      />
    </div>
  );
}

export default PainelSaldos;