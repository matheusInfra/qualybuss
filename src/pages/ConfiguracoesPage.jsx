// src/pages/ConfiguracoesPage.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getConfiguracaoIA, updateConfiguracaoIA } from '../services/configService';
// Reutilizamos o CSS do formulário para manter a consistência visual
import './FuncionarioForm.css';

// --- SUB-COMPONENTE: Formulário de Configuração da IA ---
function ConfigIAForm({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState(null);

  const { register, handleSubmit, setValue, watch } = useForm();
  
  // Monitora o valor da temperatura para exibir em tempo real
  const temperaturaAtual = watch('temperature');

  // 1. Carregar configurações atuais ao montar o componente
  useEffect(() => {
    const load = async () => {
      try {
        const data = await getConfiguracaoIA();
        if (data) {
          setConfigId(data.id);
          setValue('system_instruction', data.system_instruction);
          setValue('temperature', data.temperature);
          setValue('model_name', data.model_name || 'gemini-2.5-flash');
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar configurações da IA.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setValue]);

  // 2. Salvar alterações
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await updateConfiguracaoIA(configId, {
        system_instruction: data.system_instruction,
        temperature: parseFloat(data.temperature),
        model_name: data.model_name
      });
      toast.success('Cérebro da IA atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{ padding: '24px' }}>Carregando configurações...</p>;

  return (
    <div className="form-container">
      {/* Cabeçalho do Formulário */}
      <div className="form-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onBack} 
            className="button-secondary" 
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}
            title="Voltar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
          </button>
          <h2 style={{ margin: 0 }}>Configuração da IA (QualyBot)</h2>
        </div>
        
        <div className="form-actions-right">
          <button type="button" className="button-secondary" onClick={onBack}>
            Cancelar
          </button>
          <button 
            className="button-primary" 
            onClick={handleSubmit(onSubmit)} 
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>
      
      {/* Corpo do Formulário */}
      <div className="form-content">
        <form onSubmit={handleSubmit(onSubmit)}>
          
          {/* Prompt do Sistema */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '16px', color: '#2d3748', display: 'block', marginBottom: '8px' }}>
              Instruções do Sistema (Prompt Inicial)
            </label>
            <p style={{ fontSize: '13px', color: '#718096', marginBottom: '12px', lineHeight: '1.4' }}>
              Defina aqui a personalidade, as regras de negócio e o conhecimento base que o QualyBot deve seguir.
              Quanto mais detalhado, melhor a resposta.
            </p>
            <textarea 
              {...register('system_instruction')} 
              rows={12} 
              style={{
                width: '100%', 
                padding: '16px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '1.5',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            ></textarea>
          </div>

          <div className="form-grid">
            {/* Criatividade (Temperatura) */}
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                Criatividade (Temperatura)
                <strong>{temperaturaAtual}</strong>
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                {...register('temperature')} 
                style={{ width: '100%', cursor: 'pointer', marginTop: '8px' }} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                <span>Preciso (0.0)</span>
                <span>Criativo (1.0)</span>
              </div>
            </div>

            {/* Seleção de Modelo */}
            <div className="form-group">
              <label>Modelo de IA</label>
              <select 
                {...register('model_name')} 
                style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recomendado)</option>
                <option value="gemini-1.5-flash-001">Gemini 1.5 Flash (Estável)</option>
                <option value="gemini-1.5-pro-001">Gemini 1.5 Pro (Mais inteligente/Lento)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
              </select>
              <p style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                O modelo 2.5 Flash é a versão mais rápida e atualizada disponível para sua conta.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL: O Hub de Cards ---
function ConfiguracoesPage() {
  const [activeModule, setActiveModule] = useState(null); // null = mostra o grid, 'ia' = mostra o form

  // Se um módulo estiver selecionado, renderiza ele
  if (activeModule === 'ia') {
    return <ConfigIAForm onBack={() => setActiveModule(null)} />;
  }

  return (
    <div style={{ width: '100%', animation: 'fadeIn 0.3s ease-out' }}>
      <h1 style={{ marginBottom: '8px', color: '#1a202c' }}>Configurações do Sistema</h1>
      <p style={{ marginBottom: '32px', color: '#718096' }}>Gerencie as preferências globais e módulos do QualyBuss.</p>
      
      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '24px'
      }}>
        
        {/* Card 1: IA (Ativo) */}
        <div 
          onClick={() => setActiveModule('ia')}
          className="config-card"
          style={{
            background: 'white', 
            borderRadius: '12px', 
            padding: '32px 24px', 
            border: '1px solid #e0e0e0', 
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
          onMouseEnter={e => { 
            e.currentTarget.style.transform = 'translateY(-4px)'; 
            e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.08)'; 
            e.currentTarget.style.borderColor = '#bbeeec';
          }}
          onMouseLeave={e => { 
            e.currentTarget.style.transform = 'translateY(0)'; 
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; 
            e.currentTarget.style.borderColor = '#e0e0e0';
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', 
            background: '#e6f7ff', color: '#1890ff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>smart_toy</span>
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#2d3748', fontSize: '1.1rem' }}>Inteligência Artificial</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#718096', lineHeight: '1.5' }}>
            Personalize o comportamento, prompt e modelo do seu assistente QualyBot.
          </p>
        </div>

        {/* Card 2: Usuários (Placeholder) */}
        <div style={{
            background: 'white', borderRadius: '12px', padding: '32px 24px', 
            border: '1px solid #e0e0e0', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            opacity: 0.6, cursor: 'not-allowed'
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', 
            background: '#f0f0f0', color: '#a0aec0', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>group</span>
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#a0aec0', fontSize: '1.1rem' }}>Usuários e Permissões</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#a0aec0' }}>Em breve: Gerencie quem pode acessar o sistema.</p>
        </div>

        {/* Card 3: Empresa (Placeholder) */}
        <div style={{
            background: 'white', borderRadius: '12px', padding: '32px 24px', 
            border: '1px solid #e0e0e0', 
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            opacity: 0.6, cursor: 'not-allowed'
          }}
        >
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', 
            background: '#f0f0f0', color: '#a0aec0', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>business</span>
          </div>
          <h3 style={{ margin: '0 0 8px 0', color: '#a0aec0', fontSize: '1.1rem' }}>Dados da Empresa</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#a0aec0' }}>Em breve: Logo, CNPJ e configurações regionais.</p>
        </div>

      </div>
    </div>
  );
}

export default ConfiguracoesPage;