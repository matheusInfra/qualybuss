// src/components/Configuracao/NotificacoesManager.jsx
import React from 'react';
import './Configuracao.css';

function NotificacoesManager() {
  return (
    <div style={{padding: '20px', maxWidth: '800px', margin: '0 auto'}}>
      
      <div className="detail-header" style={{marginBottom: '30px'}}>
        <div className="detail-title">
          <h2>Notificações</h2>
          <p className="detail-subtitle">Gerencie as preferências de notificação para toda a empresa.</p>
        </div>
      </div>

      <div className="detail-card" style={{padding: '0', overflow: 'hidden'}}>
        <div style={{padding: '24px', borderBottom: '1px solid #eee'}}>
          <h3 style={{border: 'none', margin: 0}}>Tipos de Notificação</h3>
          <p style={{color: '#6b7280', fontSize: '0.9rem', marginTop: '4px'}}>
            Selecione como os funcionários receberão alertas sobre eventos importantes.
          </p>
        </div>

        {/* Lista de Toggles */}
        <div style={{display: 'flex', flexDirection: 'column'}}>
          
          {/* Item: Email */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f3f4f6'}}>
            <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
              <div style={{width: '48px', height: '48px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827'}}>
                <span className="material-symbols-outlined">mail</span>
              </div>
              <div>
                <div style={{fontWeight: 600, color: '#111827'}}>Notificações por E-mail</div>
                <div style={{fontSize: '0.85rem', color: '#6b7280'}}>Habilite para enviar notificações por e-mail para os funcionários.</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>

          {/* Item: Sistema */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f3f4f6'}}>
            <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
              <div style={{width: '48px', height: '48px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827'}}>
                <span className="material-symbols-outlined">notifications_active</span>
              </div>
              <div>
                <div style={{fontWeight: 600, color: '#111827'}}>Notificações do Sistema</div>
                <div style={{fontSize: '0.85rem', color: '#6b7280'}}>Mostre alertas dentro do sistema para eventos importantes.</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>

          {/* Item: Slack */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px'}}>
            <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
              <div style={{width: '48px', height: '48px', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827'}}>
                <span className="material-symbols-outlined">chat</span>
              </div>
              <div>
                <div style={{fontWeight: 600, color: '#111827'}}>Notificações no Slack</div>
                <div style={{fontSize: '0.85rem', color: '#6b7280'}}>Envie alertas para canais específicos do Slack (requer integração).</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" />
              <span className="slider"></span>
            </label>
          </div>

        </div>
      </div>

      {/* Frequência */}
      <div className="detail-card">
        <h3>Frequência</h3>
        <p style={{color: '#6b7280', fontSize: '0.9rem', marginBottom: '16px'}}>Defina com que frequência os resumos de notificações devem ser enviados.</p>
        <div style={{maxWidth: '300px'}}>
          <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 500, color: '#374151'}}>Resumo por E-mail</label>
          <select className="erp-select">
            <option>Nunca</option>
            <option selected>Diariamente</option>
            <option>Semanalmente</option>
            <option>Mensalmente</option>
          </select>
        </div>
      </div>

      <div className="erp-actions">
        <button className="btn-secondary" style={{background:'white', border:'1px solid #ccc', padding:'10px 20px', borderRadius:'6px', cursor:'pointer'}}>Restaurar Padrão</button>
        <button className="btn-primary">Salvar Alterações</button>
      </div>

    </div>
  );
}

export default NotificacoesManager;