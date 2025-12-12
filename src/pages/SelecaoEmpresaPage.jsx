import React from 'react';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css'; // Reutiliza estilo de login

function SelecaoEmpresaPage() {
  const { minhasEmpresas, selecionarEmpresa } = useEmpresa();
  const { signOut } = useAuth();

  return (
    <div className="login-wrapper" style={{flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
      <h1 style={{marginBottom: '30px'}}>Bem-vindo ao QualyBuss</h1>
      <p style={{color: '#999', marginBottom: '40px'}}>Selecione a unidade que deseja acessar agora:</p>

      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        maxWidth: '800px', 
        width: '100%',
        padding: '0 20px'
      }}>
        {minhasEmpresas.map(emp => (
          <div 
            key={emp.id} 
            onClick={() => selecionarEmpresa(emp)}
            style={{
              background: '#192233', 
              padding: '30px', 
              borderRadius: '12px', 
              cursor: 'pointer',
              border: '1px solid #324467',
              textAlign: 'center',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span className="material-symbols-outlined" style={{fontSize: '40px', color: '#1152d4', marginBottom: '15px'}}>store</span>
            <h3 style={{color: 'white', margin: 0}}>{emp.nome_fantasia}</h3>
            <span style={{fontSize: '12px', color: '#999', textTransform: 'uppercase', marginTop: '8px', display: 'block'}}>
              {emp.permissao}
            </span>
          </div>
        ))}
      </div>

      <button onClick={signOut} style={{marginTop: '50px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer'}}>
        Sair da conta
      </button>
    </div>
  );
}

export default SelecaoEmpresaPage;