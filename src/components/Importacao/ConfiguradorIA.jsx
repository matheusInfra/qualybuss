import React, { useState, useEffect } from 'react';
import { getConfiguracaoIA, updateConfiguracaoIA } from '../../services/iaService';
import { downloadJSON } from '../../services/importacaoService';
import { toast } from 'react-hot-toast';
import './ConfiguradorIA.css'; // Vamos criar esse CSS simples abaixo

export default function ConfiguradorIA() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await getConfiguracaoIA();
      setConfig(data);
    } catch (error) {
      toast.error("Erro ao carregar IA: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfiguracaoIA(config.id, config);
      toast.success("Cérebro da IA atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.system_instruction) {
          setConfig({ ...config, ...json }); // Mescla com o atual
          toast.success("Configuração importada! Clique em Salvar para aplicar.");
        } else {
          toast.error("JSON inválido: Falta 'system_instruction'.");
        }
      } catch (err) {
        toast.error("Erro ao ler JSON.");
      }
    };
    reader.readAsText(file);
  };

  if (loading) return <div className="loading-box">Conectando ao cérebro da IA...</div>;

  return (
    <div className="config-ia-container">
      <div className="ia-header">
        <div className="ia-info">
          <h3>Personalidade e Regras (System Prompt)</h3>
          <p>Defina como a IA deve se comportar, o que ela pode e não pode falar.</p>
        </div>
        <div className="ia-actions">
          <button className="btn-secondary" onClick={() => downloadJSON(config, `backup_ia_${new Date().toISOString().split('T')[0]}.json`)}>
            <span className="material-symbols-outlined">download</span> Backup
          </button>
          <label className="btn-secondary upload-btn">
            <span className="material-symbols-outlined">upload</span> Restaurar
            <input type="file" accept=".json" onChange={handleImportJSON} hidden />
          </label>
        </div>
      </div>

      <div className="ia-editor">
        <label>Instrução do Sistema (Prompt Mestre)</label>
        <textarea
          value={config?.system_instruction || ''}
          onChange={(e) => setConfig({ ...config, system_instruction: e.target.value })}
          rows={15}
          placeholder="Ex: Você é um especialista em RH..."
        />
      </div>

      <div className="ia-params">
        <div className="param-group">
          <label>Modelo</label>
          <select 
            value={config?.model_name}
            onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rápido)</option>
            <option value="gemini-pro">Gemini Pro (Completo)</option>
          </select>
        </div>
        <div className="param-group">
          <label>Criatividade (Temperatura): {config?.temperature}</label>
          <input 
            type="range" min="0" max="1" step="0.1"
            value={config?.temperature || 0.4}
            onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
          />
          <small>0 = Robótico/Preciso | 1 = Criativo/Solto</small>
        </div>
      </div>

      <div className="ia-footer">
        <button className="btn-save-ia" onClick={handleSave} disabled={saving}>
          {saving ? "Atualizando..." : "Salvar Nova Personalidade"}
        </button>
      </div>
    </div>
  );
}