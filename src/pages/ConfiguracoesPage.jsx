import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getConfiguracaoIA, updateConfiguracaoIA } from '../services/configService';
import EmpresaManager from '../components/Configuracao/EmpresaManager';
import UsuarioManager from '../components/Configuracao/UsuarioManager'; // NOVO IMPORT
import './FuncionarioForm.css'; // CSS antigo (pode ser mantido ou migrado)

// --- SUB-COMPONENTE: Formulário de Configuração da IA ---
function ConfigIAForm({ onBack }) {
  // ... (Mantenha o código existente do form de IA aqui) ...
  // Vou omitir o conteúdo repetido para focar na estrutura
  return <div>Formulário IA (código já existente) <button onClick={onBack}>Voltar</button></div>;
}

// --- COMPONENTE PRINCIPAL ---
function ConfiguracoesPage() {
  const [activeModule, setActiveModule] = useState(null);

  // Roteamento interno
  if (activeModule === 'ia') return <ConfigIAForm onBack={() => setActiveModule(null)} />;
  if (activeModule === 'empresas') return <EmpresaManager onBack={() => setActiveModule(null)} />;
  if (activeModule === 'usuarios') return <UsuarioManager onBack={() => setActiveModule(null)} />; // NOVO

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
        <div 
          onClick={() => setActiveModule('empresas')}
          className="config-card"
          style={{
            background: 'white', borderRadius: '12px', padding: '32px 24px', 
            border: '1px solid #e0e0e0', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', 
            background: '#f0fff4', color: '#2f855a', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>business</span>
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '1.1rem' }}>Gestão de Empresas</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>Cadastre filiais e dados da organização.</p>
        </div>

        {/* Card 2: Usuários (AGORA ATIVO) */}
        <div 
          onClick={() => setActiveModule('usuarios')}
          className="config-card"
          style={{
            background: 'white', borderRadius: '12px', padding: '32px 24px', 
            border: '1px solid #e0e0e0', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', 
            background: '#fff5f5', color: '#e53e3e', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>group</span>
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '1.1rem' }}>Usuários e Permissões</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>Convide e gerencie acesso ao sistema.</p>
        </div>

        {/* Card 3: IA */}
        <div 
          onClick={() => setActiveModule('ia')}
          className="config-card"
          style={{
            background: 'white', borderRadius: '12px', padding: '32px 24px', 
            border: '1px solid #e0e0e0', cursor: 'not-allowed', // Mantendo restrito se desejar
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden'
          }}
        >
          {/* Label Restrito */}
          <div style={{position: 'absolute', top: '12px', right: '12px', background: '#f7fafc', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #e2e8f0'}}>
            <span className="material-symbols-outlined" style={{fontSize: '16px', color: '#718096'}}>lock</span>
            <span style={{fontSize: '11px', fontWeight: '600', color: '#718096'}}>Restrito TI</span>
          </div>
          
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', 
            background: '#e6f7ff', color: '#1890ff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>smart_toy</span>
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '1.1rem' }}>Inteligência Artificial</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096' }}>Configurações do QualyBot.</p>
        </div>

      </div>
    </div>
  );
}

export default ConfiguracoesPage;