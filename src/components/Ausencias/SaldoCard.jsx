// src/components/Ausencias/SaldoCard.jsx

import React from 'react';

const formatarData = (dataStr) => new Date(dataStr.replace(/-/g, '/')).toLocaleDateString('pt-BR');

function SaldoCard({ funcionario, saldos, ultimosDebitos, getAvatarUrl, onAjustar, onVerExtrato }) {
  
  const saldoFerias = saldos['Férias'] || 0;
  const horasBanco = saldos['Banco de Horas'] || 0;
  const horasPorDia = 8;
  const totalFolgasEmDias = saldoFerias + (horasBanco / horasPorDia);
  
  let statusColor = 'green';
  let statusText = 'Saldo Saudável';

  if (saldoFerias <= 0) {
    statusColor = 'red';
    statusText = 'CRÍTICO: Saldo Baixo';
  } else if (saldoFerias <= 15) {
    statusColor = 'yellow';
    statusText = 'Atenção';
  }

  const maxDiasVisual = 30;
  const percentual = Math.min(100, Math.max(0, (saldoFerias / maxDiasVisual) * 100));

  return (
    <div className={`saldo-card status-${statusColor}`}>
      
      <div className="card-header-saldo">
        <img 
          src={getAvatarUrl(funcionario.avatar_url) || 'https://placehold.co/100'} 
          alt={funcionario.nome_completo} 
          className="card-avatar-saldo"
        />
        <div className="status-pill-saldo">{statusText}</div>
      </div>

      <div className="total-consolidado-kpi">
        <span className="consolidado-label">TOTAL DISPONÍVEL</span>
        <span className="consolidado-value">{totalFolgasEmDias.toFixed(1)} Dias</span>
      </div>

      <div className="card-info-saldo">
        <h3 className="card-nome-saldo">{funcionario.nome_completo}</h3>
        <p className="card-cargo-saldo">{funcionario.cargo || 'Não definido'}</p>
      </div>

      <div className="saldo-bar-container">
        <div className="saldo-bar-progress" style={{ width: `${percentual}%` }}></div>
      </div>

      <div className="saldo-details-grid" style={{gridTemplateColumns: `repeat(${Math.max(1, Object.keys(saldos).length)}, 1fr)`}}>
        {Object.keys(saldos).length > 0 ? Object.keys(saldos).map(tipo => {
          const valor = saldos[tipo];
          const unidade = tipo.includes('Horas') ? 'h' : 'd';
          const isFerias = tipo === 'Férias';
          return (
            <div key={tipo} className={`saldo-item-detail ${isFerias ? 'ferias' : 'banco-horas'}`}>
              <span className="saldo-value-main">{valor.toFixed(1)}</span>
              <span className="saldo-label-main">{tipo} ({unidade})</span>
            </div>
          );
        }) : (
            <span className="saldo-label-main" style={{gridColumn: 'span 2', textAlign: 'center'}}>Sem saldos cadastrados</span>
        )}
      </div>
      
      {/* Ações */}
      <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'}}>
        <button 
          className="button-lancar-saldo"
          onClick={() => onAjustar(funcionario)}
          title="Lançar Crédito/Débito Manual"
        >
          Ajustar Saldo
        </button>
        
        <button 
          className="button-ver-extrato" 
          onClick={() => onVerExtrato(funcionario)}
        >
          Ver Extrato Detalhado
        </button>
      </div>

    </div>
  );
}

export default SaldoCard;