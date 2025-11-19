// src/pages/ConfiguracoesPage.jsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getConfiguracaoIA, updateConfiguracaoIA } from '../services/configService';
import './FuncionarioForm.css'; // Reutilizando estilos de formulário existentes

function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState(null);

  const { register, handleSubmit, setValue, watch } = useForm();

  // Monitora a temperatura para mostrar o valor em tempo real
  const temperaturaAtual = watch('temperature');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getConfiguracaoIA();
      if (data) {
        setConfigId(data.id);
        setValue('system_instruction', data.system_instruction);
        setValue('temperature', data.temperature);
        setValue('model_name', data.model_name);
      }
    } catch (error) {
      toast.error('Erro ao carregar configurações.');
    } finally {
      setLoading(false);
    }
  };

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
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p style={{padding: '20px'}}>Carregando configurações...</p>;

  return (
    <div className="form-container">
      <div className="form-header">
        <h2>Configurações da IA (QualyBot)</h2>
        <button 
          className="button-primary" 
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="form-content">
        <form onSubmit={handleSubmit(onSubmit)}>
          
          <div className="form-group" style={{marginBottom: '20px'}}>
            <label style={{fontSize: '16px', color: '#2d3748'}}>Instruções do Sistema (Prompt Inicial)</label>
            <p style={{fontSize: '13px', color: '#718096', marginBottom: '8px'}}>
              Defina aqui a personalidade, as regras e o conhecimento base que a IA deve ter sobre a empresa.
            </p>
            <textarea
              {...register('system_instruction')}
              rows={15}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'monospace',
                lineHeight: '1.5',
                resize: 'vertical'
              }}
            ></textarea>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Criatividade (Temperatura): {temperaturaAtual}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                {...register('temperature')} 
                style={{width: '100%', cursor: 'pointer'}}
              />
              <p style={{fontSize: '12px', color: '#718096'}}>
                0.0 = Muito preciso e robótico.<br/>
                1.0 = Muito criativo e imprevisível.
              </p>
            </div>

            <div className="form-group">
              <label>Modelo da IA</label>
              <select {...register('model_name')} style={{padding: '10px', borderRadius: '4px', border: '1px solid #ddd'}}>
                <option value="gemini-1.5-flash-001">Gemini 1.5 Flash (Padrão)</option>
                <option value="gemini-1.5-pro-001">Gemini 1.5 Pro (Mais inteligente/Lento)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
              </select>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

export default ConfiguracoesPage;