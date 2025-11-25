import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionarios } from '../../services/funcionarioService';
import { createAusencia, updateAusencia, getAusenciaById, uploadAnexoAusencia, checkExistingFeriasNoAno } from '../../services/ausenciaService';
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
  const { mutate } = useSWRConfig();
  const isEditMode = Boolean(idParaEditar);

  const { data: funcionarios, isLoading: loadingFunc } = useSWR('getFuncionarios', getFuncionarios, { revalidateOnFocus: false });
  const { data: dadosAusencia } = useSWR(isEditMode ? ['ausencia', idParaEditar] : null, () => getAusenciaById(idParaEditar));

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
  const handleFile = (e) => e.target.files[0] && setAnexoFile(e.target.files[0]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.funcionario_id || !formData.tipo || !formData.data_inicio || !formData.data_fim) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    // Validação de Regra de Negócio (Férias)
    if (formData.tipo === 'Férias' && !isEditMode) {
      const ano = new Date(formData.data_inicio).getFullYear();
      const jaTem = await checkExistingFeriasNoAno(formData.funcionario_id, ano);
      if (jaTem) {
        toast.error(`Colaborador já possui férias em ${ano}.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let anexoPath = formData.anexo_path;
      if (anexoFile) anexoPath = await uploadAnexoAusencia(anexoFile, formData.funcionario_id);

      const payload = { ...formData, anexo_path: anexoPath };
      
      if (isEditMode) {
        await updateAusencia(idParaEditar, payload);
        toast.success('Atualizado com sucesso!');
      } else {
        await createAusencia(payload);
        toast.success('Lançamento registrado!');
      }
      
      mutate('getMuralRecente');
      mutate('getHistoricoAusencias');
      onClose();
    } catch (err) {
      toast.error(err.message);
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
            
            <div className="form-section-title">Quem?</div>
            <div className="ausencia-form-group">
              <label>Colaborador *</label>
              <select name="funcionario_id" value={formData.funcionario_id} onChange={handleChange} disabled={isEditMode || loadingFunc} required>
                <option value="">Selecione...</option>
                {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
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

            <div className="form-section-title">O quê?</div>
            <div className="ausencia-form-group ausencia-form-span-2">
              <label>Motivo da Ausência *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required>
                <option value="">Selecione...</option>
                <option value="Férias">Férias</option>
                <option value="Atestado Médico">Atestado Médico</option>
                <option value="Folga Pessoal">Folga Pessoal / Abono</option>
                <option value="Licença Maternidade/Paternidade">Licença Maternidade/Paternidade</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="form-section-title">Quando?</div>
            <div className="ausencia-form-group">
              <label>Início *</label>
              <input type="date" name="data_inicio" value={formData.data_inicio} onChange={handleChange} required />
            </div>
            <div className="ausencia-form-group">
              <label>Fim *</label>
              <input type="date" name="data_fim" value={formData.data_fim} onChange={handleChange} required />
            </div>

            <div className="form-section-title">Comprovantes</div>
            <div className="ausencia-form-group ausencia-form-span-2">
              <label className="ausencia-upload-label">
                <span className="material-symbols-outlined" style={{fontSize:'32px', color:'#94a3b8'}}>cloud_upload</span>
                <div style={{textAlign:'center', marginTop:'8px'}}>
                  {anexoFile ? <span className="ausencia-file-name">{anexoFile.name}</span> : 
                   formData.anexo_path ? <span className="ausencia-file-name">Anexo Salvo (Trocar?)</span> :
                   <span style={{color:'#64748b', fontSize:'0.9rem'}}>Clique ou arraste o atestado aqui</span>}
                </div>
                <input type="file" onChange={handleFile} style={{display:'none'}} accept=".pdf,.jpg,.png" />
              </label>
            </div>

            <div className="ausencia-form-group ausencia-form-span-2">
              <label>Observações</label>
              <textarea name="motivo" rows="3" value={formData.motivo || ''} onChange={handleChange}></textarea>
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