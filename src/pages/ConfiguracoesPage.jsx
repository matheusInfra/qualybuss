import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

// Imports dos Sub-módulos
import UsuarioManager from '../components/Configuracao/UsuarioManager';
import EmpresaManager from '../components/Configuracao/EmpresaManager';
import ConfiguradorIA from '../components/Importacao/ConfiguradorIA';
import NotificacoesManager from '../components/Configuracao/NotificacoesManager';

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('empresas');

  return (
    <div className="configuracoes-container">
      <div className="config-header">
        <h1>Configurações do Sistema</h1>
        <p>Gerencie empresas, usuários e inteligência artificial.</p>
      </div>

      <div className="config-tabs">
        <button className={activeTab === 'empresas' ? 'active' : ''} onClick={() => setActiveTab('empresas')}>
          <span className="material-symbols-outlined">apartment</span> Multi-Empresas
        </button>
        <button className={activeTab === 'usuarios' ? 'active' : ''} onClick={() => setActiveTab('usuarios')}>
          <span className="material-symbols-outlined">group</span> Usuários
        </button>
        <button className={activeTab === 'ia' ? 'active' : ''} onClick={() => setActiveTab('ia')}>
          <span className="material-symbols-outlined">smart_toy</span> Inteligência Artificial
        </button>
        <button className={activeTab === 'notificacoes' ? 'active' : ''} onClick={() => setActiveTab('notificacoes')}>
          <span className="material-symbols-outlined">notifications</span> Notificações
        </button>
      </div>

      <div className="config-content fade-in">
        {/* ABA EMPRESAS */}
        {activeTab === 'empresas' && <EmpresaManager />}

        {/* ABA USUÁRIOS */}
        {activeTab === 'usuarios' && <UsuarioManager />}

        {/* ABA IA */}
        {activeTab === 'ia' && <ConfiguradorIA />}

        {/* ABA NOTIFICAÇÕES */}
        {activeTab === 'notificacoes' && <NotificacoesManager />}
      </div>
    </div>
  );
}
