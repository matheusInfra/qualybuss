// src/components/Ausencias/PainelSaldos.jsx
import React, { useMemo } from 'react';
import useSWR from 'swr';
import { getSaldosConsolidados } from '../../services/saldoService';
import { getMuralRecente } from '../../services/ausenciaService'; // <--- USAR ESTA FUNÇÃO
import { getAvatarPublicUrl } from '../../services/funcionarioService';
import SaldoCard from './SaldoCard';
import './PainelSaldos.css';

function PainelSaldos({ aoVerExtrato, aoAjustar }) { // Recebe props de navegação se existirem
  // 1. Busca os saldos (View SQL)
  const { data: dadosView, isLoading: loadingSaldos } = useSWR('getSaldosConsolidados', getSaldosConsolidados);

  // 2. Busca TODAS as movimentações recentes (Créditos + Débitos + Períodos)
  const { data: muralData } = useSWR('getMuralRecente', getMuralRecente);

  // 3. Processa a lista unificada de movimentos para exibir nos cards
  const movimentosPorFuncionario = useMemo(() => {
    if (!muralData) return {};
    
    const { ausencias, creditos, periodos } = muralData;
    const mapa = {};

    const addMovimento = (item, tipo, desc) => {
      if (!mapa[item.funcionario_id]) mapa[item.funcionario_id] = [];
      mapa[item.funcionario_id].push({
        id: item.id,
        data: new Date(item.data_inicio || item.data_lancamento || item.inicio_periodo || item.created_at),
        tipo: tipo, // 'entrada' ou 'saida'
        descricao: desc || item.tipo,
        status: item.status || 'Concluído'
      });
    };

    ausencias.forEach(a => addMovimento(a, 'saida', a.tipo)); // Débito
    creditos.forEach(c => addMovimento(c, 'entrada', `Crédito: ${c.tipo}`)); // Crédito
    periodos.forEach(p => addMovimento(p, 'entrada', 'Novo Período Aquisitivo')); // Crédito

    // Ordena
    Object.keys(mapa).forEach(key => {
      mapa[key].sort((a, b) => b.data - a.data);
    });

    return mapa;
  }, [muralData]);

  // 4. Agrupa os saldos por funcionário
  const funcionariosAgrupados = useMemo(() => {
    if (!dadosView) return [];
    const map = new Map();

    dadosView.forEach(row => {
      if (!row.tipo_saldo) return;
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

  if (loadingSaldos) return <div className="painel-loading"><p>Calculando saldos...</p></div>;

  return (
    <div className="painel-saldos-container">
      <div className="saldos-grid">
        {funcionariosAgrupados.map((func) => (
          <SaldoCard 
            key={func.id}
            funcionario={func}
            saldos={func.saldos}
            // Passa a lista real de auditoria (últimos 3 movimentos)
            ultimosMovimentos={movimentosPorFuncionario[func.id]?.slice(0, 3) || []} 
            getAvatarUrl={getAvatarPublicUrl}
            onAjustar={() => aoAjustar ? aoAjustar(func) : null} // Fallback
            onVerExtrato={() => aoVerExtrato ? aoVerExtrato(func) : null}
          />
        ))}
        
        {funcionariosAgrupados.length === 0 && (
           <p style={{gridColumn: '1/-1', textAlign: 'center', color: '#666', padding: '40px'}}>
             Nenhum saldo calculado ainda.
           </p>
        )}
      </div>
    </div>
  );
}

export default PainelSaldos;