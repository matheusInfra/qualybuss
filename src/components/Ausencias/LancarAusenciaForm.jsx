// src/components/Ausencias/LancarAusenciaForm.jsx

import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionarios } from '../../services/funcionarioService';
import { 
  createAusencia, 
  updateAusencia, 
  getAusenciaById, 
  uploadAnexoAusencia, 
  checkExistingFeriasNoAno 
} from '../../services/ausenciaService';
import './LancarAusenciaForm.css';

const initialState = {
  funcionario_id: '',
  tipo: '',
  data_inicio: '',
  data_fim: '',
  motivo: '',
  status: 'Pendente',
};

function LancarAusenciaForm({ idParaEditar = null, onClose }) {
  const [formData, setFormData] = useState(initialState);
  const [anexoFile, setAnexoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hook para atualizar o cache global
  const { mutate } = useSWRConfig();
  
  const isEditMode = Boolean(idParaEditar);

  // Buscas de dados (SWR)
  const { data: funcionarios, isLoading: loadingFunc } = useSWR(
    'getFuncionarios', 
    getFuncionarios, 
    { revalidateOnFocus: false }
  );
  
  const { data: dadosAusencia } = useSWR(
    isEditMode ? ['ausencia', idParaEditar] : null, 
    () => getAusenciaById(idParaEditar)
  );

  // Preenche o formulário se for edição
  useEffect(() => {
    if (dadosAusencia) {
      setFormData({
        ...dadosAusencia,
        data_inicio: dadosAusencia.data_inicio?.split('T')[0] || '',
        data_fim: dadosAusencia.data_fim?.split('T')[0] || '',
      });
    }
  }, [dadosAusencia]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  
  const handleFile = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAnexoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validação Básica
    if (!formData.funcionario_id || !formData.tipo || !formData.data_inicio || !formData.data_fim) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    // 2. Validação de Regra de Negócio (Férias duplicadas no ano)
    if (formData.tipo === 'Férias' && !isEditMode) {
      const ano = new Date(formData.data_inicio).getFullYear();
      try {
        const jaTem = await checkExistingFeriasNoAno(formData.funcionario_id, ano);
        if (jaTem) {
          toast.error(`Colaborador já possui férias lançadas em ${ano}.`);
          return;
        }
      } catch (error) {
        console.error(error);
        // Não bloqueia se der erro na verificação, apenas avisa
      }
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Salvando lançamento...');

    try {
      // 3. Upload do Anexo (se houver)
      let anexoPath = formData.anexo_path;
      if (anexoFile) {
        anexoPath = await uploadAnexoAusencia(anexoFile, formData.funcionario_id);
      }

      const payload = { ...formData, anexo_path: anexoPath };
      
      // 4. Salvar no Banco (Create ou Update)
      if (isEditMode) {
        await updateAusencia(idParaEditar, payload);
        toast.success('Lançamento atualizado!', { id: toastId });
      } else {
        await createAusencia(payload);
        toast.success('Lançamento registrado!', { id: toastId });
      }
      
      // 5. ATUALIZAÇÃO DE CACHE (CRUCIAL PARA AS TELAS ATUALIZAREM)
      await Promise.all([
        // Atualiza o Mural de Cards
        mutate('getMuralRecente'),
        // Atualiza a Tabela de Histórico
        mutate('getHistoricoAusencias'),
        // Atualiza o Painel de Saldos (caso afete dias gozados)
        mutate('getSaldosConsolidados'),
        // Atualiza qualquer busca de calendário (chave dinâmica)
        mutate(key => Array.isArray(key) && key[0] === 'ferias'),
        // Atualiza buscas de extrato filtrado
        mutate(key => Array.isArray(key) && key[0] === 'extrato')
      ]);

      onClose(); // Fecha o modal
    } catch (err) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ausencia-form-container">
      {isSubmitting && <div className="form-loading-overlay"><div className="form-spinner"></div></div>}

      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', height:'100%'}}>
        <div className="ausencia-form-content">
          <div className="ausencia-form-grid">
            
            {/* Seção 1: Quem */}
            <div className="form-section-title">Quem?</div>
            <div className="ausencia-form-group">
              <label>Colaborador *</label>
              <select 
                name="funcionario_id" 
                value={formData.funcionario_id} 
                onChange={handleChange} 
                disabled={isEditMode || loadingFunc} 
                required
              >
                <option value="">{loadingFunc ? 'Carregando...' : 'Selecione...'}</option>
                {funcionarios?.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_completo}</option>
                ))}
              </select>
            </div>

            <div className="ausencia-form-group">
              <label>Status do Lançamento</label>
              <select name="status" value={formData.status} onChange={handleChange} required>
                <option value="Pendente">Pendente (Rascunho)</option>
                <option value="Aprovado">Aprovado (Oficial)</option>
                <option value="Rejeitado">Rejeitado</option>
              </select>
            </div>

            {/* Seção 2: O quê */}
            <div className="form-section-title">O quê?</div>
            <div className="ausencia-form-group ausencia-form-span-2">
              <label>Motivo da Ausência *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                <option value="">Selecione...</option>
                <option value="Férias">Férias (Gozo)</option>
                <option value="Atestado Médico">Atestado Médico</option>
                <option value="Folga Pessoal">Folga Pessoal / Abono</option>
                <option value="Licença Maternidade/Paternidade">Licença Maternidade/Paternidade</option>
                <option value="Licença não remunerada">Licença não remunerada</option>
                <option value="Compensação Banco">Compensação de Banco de Horas</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Seção 3: Quando */}
            <div className="form-section-title">Quando?</div>
            <div className="ausencia-form-group">
              <label>Início *</label>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">calendar_today</span>
                <input type="date" name="data_inicio" value={formData.data_inicio} onChange={handleChange} required />
              </div>
            </div>
            <div className="ausencia-form-group">
              <label>Fim *</label>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">event_busy</span>
                <input type="date" name="data_fim" value={formData.data_fim} onChange={handleChange} required />
              </div>
            </div>

            {/* Seção 4: Comprovantes */}
            <div className="form-section-title">Comprovantes</div>
            <div className="ausencia-form-group ausencia-form-span-2">
              <label className="ausencia-upload-label">
                <span className="material-symbols-outlined" style={{fontSize:'32px', color:'#94a3b8'}}>cloud_upload</span>
                <div style={{textAlign:'center', marginTop:'8px'}}>
                  {anexoFile ? (
                    <span className="ausencia-file-name">{anexoFile.name}</span>
                  ) : formData.anexo_path ? (
                    <span className="ausencia-file-name">Anexo Salvo (Clique para trocar)</span>
                  ) : (
                    <>
                      <span style={{color:'#1e293b', fontWeight:600, fontSize:'0.9rem'}}>Clique para anexar</span>
                      <span style={{display:'block', color:'#64748b', fontSize:'0.8rem'}}>PDF, JPG ou PNG (Máx 5MB)</span>
                    </>
                  )}
                </div>
                <input type="file" onChange={handleFile} style={{display:'none'}} accept=".pdf,.jpg,.jpeg,.png" />
              </label>
            </div>

            <div className="ausencia-form-group ausencia-form-span-2">
              <label>Observações</label>
              <textarea 
                name="motivo" 
                rows="3" 
                placeholder="Detalhes adicionais..." 
                value={formData.motivo || ''} 
                onChange={handleChange}
              ></textarea>
            </div>

          </div>
        </div>

        <div className="ausencia-form-footer">
          <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
          <button type="submit" className="button-primary" disabled={isSubmitting}>
            <span className="material-symbols-outlined">save</span> Salvar Lançamento
          </button>
        </div>
      </form>
    </div>
  );
}

export default LancarAusenciaForm;