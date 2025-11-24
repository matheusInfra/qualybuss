import React, { useState } from 'react';
import EmpresaManager from '../components/Configuracao/EmpresaManager';
import UsuarioManager from '../components/Configuracao/UsuarioManager';
import NotificacoesManager from '../components/Configuracao/NotificacoesManager'; // NOVO
import './FuncionarioForm.css'; // Pode remover se não usar mais
import '../components/Configuracao/Configuracao.css'; // Garante que o CSS novo carregue

// Sub-componentes placeholders se necessário
function ConfigIAForm({ onBack }) { return <div><button onClick={onBack}>Voltar</button> IA Config...</div> }

function ConfiguracoesPage() {
  const [activeModule, setActiveModule] = useState(null);

  // Roteamento interno
  if (activeModule === 'empresas') return <EmpresaManager onBack={() => setActiveModule(null)} />;
  if (activeModule === 'usuarios') return <UsuarioManager onBack={() => setActiveModule(null)} />;
  if (activeModule === 'notificacoes') return (
    <div className="config-split-layout"> {/* Envolve em layout para manter padrão se quiser */}
      <div style={{flex:1, overflowY: 'auto', background:'#f8f9fa'}}>
         <button onClick={() => setActiveModule(null)} style={{margin:'20px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', color:'#666'}}>
            <span className="material-symbols-outlined">arrow_back</span> Voltar
         </button>
         <NotificacoesManager />
      </div>
    </div>
  );
  if (activeModule === 'ia') return <ConfigIAForm onBack={() => setActiveModule(null)} />;

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ marginBottom: '8px', color: '#1a202c' }}>Configurações do Sistema</h1>
      <p style={{ marginBottom: '32px', color: '#718096' }}>
        Gerencie as preferências globais e módulos do QualyBuss.
      </p>
      
      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '24px'
      }}>
        
        {/* Card 1: Empresas */}
        <div onClick={() => setActiveModule('empresas')} className="config-home-card">
          <div className="icon-bg blue"><span className="material-symbols-outlined">business</span></div>
          <h3>Gestão de Empresas</h3>
          <p>Cadastre filiais e dados da organização.</p>
        </div>

        {/* Card 2: Usuários */}
        <div onClick={() => setActiveModule('usuarios')} className="config-home-card">
          <div className="icon-bg green"><span className="material-symbols-outlined">group</span></div>
          <h3>Usuários e Permissões</h3>
          <p>Convide e gerencie acesso ao sistema.</p>
        </div>

        {/* Card 3: Notificações (NOVO) */}
        <div onClick={() => setActiveModule('notificacoes')} className="config-home-card">
          <div className="icon-bg orange" style={{background:'#fff7ed', color:'#c2410c'}}>
            <span className="material-symbols-outlined">notifications</span>
          </div>
          <h3>Notificações</h3>
          <p>Alertas por e-mail, sistema e integrações.</p>
        </div>

        {/* Card 4: IA */}
        <div onClick={() => setActiveModule('ia')} className="config-home-card disabled">
          <div className="icon-bg purple" style={{background:'#f3e8ff', color:'#7e22ce'}}>
             <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <h3>Inteligência Artificial</h3>
          <p>Configurações do QualyBot (Em breve).</p>
        </div>

      </div>
    </div>
  );
}

export default ConfiguracoesPage;