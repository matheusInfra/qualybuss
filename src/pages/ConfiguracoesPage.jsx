import React, { useState } from 'react';
import EmpresaManager from '../components/Configuracao/EmpresaManager';
import UsuarioManager from '../components/Configuracao/UsuarioManager';
import NotificacoesManager from '../components/Configuracao/NotificacoesManager';
import '../components/Configuracao/Configuracao.css'; 

function ConfiguracoesPage() {
  const [activeModule, setActiveModule] = useState(null);

  // Função que renderiza o módulo com o botão de VOLTAR funcional
  const renderModule = (Component) => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 0 16px 0' }}>
        <button 
          onClick={() => setActiveModule(null)} // <-- AQUI ESTÁ O "VOLTAR"
          className="btn-back-link"
        >
          <span className="material-symbols-outlined">arrow_back</span> 
          Voltar para Configurações
        </button>
      </div>
      <Component />
    </div>
  );

  // Roteamento
  if (activeModule === 'empresas') return renderModule(EmpresaManager);
  if (activeModule === 'usuarios') return renderModule(UsuarioManager);
  if (activeModule === 'notificacoes') return renderModule(NotificacoesManager);

  return (
    <div className="config-container">
      <div style={{marginBottom: '32px'}}>
        <h1 style={{ margin: '0 0 8px 0', color: '#111827', fontSize: '2rem', fontWeight: 700 }}>Configurações</h1>
        <p style={{ margin: 0, color: '#6b7280' }}>Gerencie as preferências globais e módulos do sistema.</p>
      </div>
      
      <div className="config-grid">
        <div onClick={() => setActiveModule('empresas')} className="config-home-card">
          <div className="icon-bg blue"><span className="material-symbols-outlined">business</span></div>
          <h3>Gestão de Empresas</h3>
          <p>Cadastre filiais, dados fiscais e unidades de negócio.</p>
        </div>

        <div onClick={() => setActiveModule('usuarios')} className="config-home-card">
          <div className="icon-bg green"><span className="material-symbols-outlined">group</span></div>
          <h3>Usuários e Permissões</h3>
          <p>Gerencie logins, funções e níveis de acesso.</p>
        </div>

        <div onClick={() => setActiveModule('notificacoes')} className="config-home-card">
          <div className="icon-bg orange"><span className="material-symbols-outlined">notifications</span></div>
          <h3>Notificações</h3>
          <p>Alertas por e-mail, sistema e integrações.</p>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracoesPage;