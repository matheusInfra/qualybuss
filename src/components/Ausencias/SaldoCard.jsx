// src/components/Ausencias/SaldoCard.jsx
import React from 'react';

function SaldoCard({ funcionario, saldos, getAvatarUrl, onAjustar, onVerExtrato }) {
  
  // Dados calculados
  const saldoFerias = saldos['Férias'] || 0;
  const bancoHoras = saldos['Banco de Horas'] || 0;
  
  // Lógica visual de status
  let status = 'Regular';
  let statusClass = 'neutral';

  if (saldoFerias >= 30) {
    status = 'Férias Vencidas';
    statusClass = 'danger';
  } else if (saldoFerias >= 20) {
    status = 'Acumulando';
    statusClass = 'warning';
  } else {
    status = 'Em dia';
    statusClass = 'success';
  }

  return (
    <div className={`saldo-card-modern ${statusClass}`}>
      
      {/* Cabeçalho: Perfil */}
      <div className="saldo-header">
        <div className="saldo-profile">
          <img 
            src={getAvatarUrl(funcionario.avatar_url) || `https://ui-avatars.com/api/?name=${funcionario.nome_completo}&background=random`} 
            alt={funcionario.nome_completo} 
            className="saldo-avatar"
          />
          <div className="saldo-info">
            <h3 className="saldo-name" title={funcionario.nome_completo}>{funcionario.nome_completo}</h3>
            <span className="saldo-role">{funcionario.cargo || 'Não informado'}</span>
          </div>
        </div>
        <span className={`saldo-badge ${statusClass}`}>{status}</span>
      </div>

      <div className="saldo-divider"></div>

      {/* Corpo: KPIs (Números Grandes) */}
      <div className="saldo-kpi-grid">
        <div className="kpi-box">
          <span className="kpi-label">Saldo Férias</span>
          <div className="kpi-value-group">
            <span className="kpi-number">{saldoFerias.toFixed(1)}</span>
            <span className="kpi-unit">dias</span>
          </div>
        </div>
        
        <div className="kpi-separator"></div>

        <div className="kpi-box">
          <span className="kpi-label">Banco Horas</span>
          <div className="kpi-value-group">
            <span className={`kpi-number ${bancoHoras < 0 ? 'text-red' : ''}`}>
              {bancoHoras > 0 ? '+' : ''}{bancoHoras.toFixed(1)}
            </span>
            <span className="kpi-unit">hs</span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso (Visual do Saldo de Férias 0 a 30) */}
      <div className="saldo-progress-wrapper" title="Progresso para 30 dias">
        <div className="saldo-progress-bg">
          <div 
            className="saldo-progress-bar" 
            style={{ width: `${Math.min(100, Math.max(0, (saldoFerias/30)*100))}%` }}
          ></div>
        </div>
      </div>

      {/* Rodapé: Ações */}
      <div className="saldo-actions">
        <button className="btn-action outline" onClick={() => onVerExtrato(funcionario)}>
          <span className="material-symbols-outlined">history</span> Extrato
        </button>
        <button className="btn-action primary" onClick={() => onAjustar(funcionario)}>
          <span className="material-symbols-outlined">tune</span> Ajustar
        </button>
      </div>

    </div>
  );
}

export default SaldoCard;