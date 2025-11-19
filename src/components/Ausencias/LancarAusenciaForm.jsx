// src/components/Ausencias/LancarAusenciaForm.jsx

import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';

import { getFuncionarios } from '../../services/funcionarioService';
import { 
  createAusencia, 
  uploadAnexoAusencia,
  getAusenciaById,
  updateAusencia,
  checkExistingFeriasNoAno // Importa a nova verificação
} from '../../services/ausenciaService';
import './LancarAusenciaForm.css'; //

// initialState agora inclui o 'status'
const initialState = {
  funcionario_id: '',
  tipo: '',
  data_inicio: '',
  data_fim: '',
  motivo: '',
  status: 'Pendente', // Campo adicionado
};

/**
 * Este formulário agora gerencia tanto a CRIAÇÃO quanto a EDIÇÃO
 * de um lançamento de ausência (débito).
 */
function LancarAusenciaForm({ idParaEditar = null, onClose }) {
  const [formData, setFormData] = useState(initialState);
  const [anexoFile, setAnexoFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { mutate } = useSWRConfig();
  const isEditMode = Boolean(idParaEditar);

  // --- BUSCA 1: Lista de funcionários (para o dropdown) ---
  const {
    data: funcionarios,
    error: errorFuncionarios,
    isLoading: isLoadingFuncionarios
  } = useSWR('getFuncionarios', getFuncionarios, { revalidateOnFocus: false });

  // --- BUSCA 2: Dados da ausência (se estiver em modo de edição) ---
  const { 
    data: dadosAusencia, 
    error: fetchError, 
    isLoading: isFetching 
  } = useSWR(
    isEditMode ? ['ausencia', idParaEditar] : null, 
    () => getAusenciaById(idParaEditar)
  );

  // Efeito para preencher o formulário quando os dados de edição chegarem
  useEffect(() => {
    if (dadosAusencia) {
      const formattedData = {
        ...dadosAusencia,
        data_inicio: dadosAusencia.data_inicio ? dadosAusencia.data_inicio.split('T')[0] : '',
        data_fim: dadosAusencia.data_fim ? dadosAusencia.data_fim.split('T')[0] : '',
        status: dadosAusencia.status || 'Pendente',
      };
      setFormData(formattedData);
    }
  }, [dadosAusencia]);

  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error("Arquivo muito grande. Máximo de 5MB.");
        e.target.value = null;
        return;
      }
      setAnexoFile(file);
    } else {
      setAnexoFile(null);
    }
  };

  // Lógica de Submit que sabe a diferença entre Criar e Atualizar
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.funcionario_id || !formData.tipo || !formData.data_inicio || !formData.data_fim) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // --- BLOCO DE VERIFICAÇÃO (REGRA DE NEGÓCIO) ---
    if (formData.tipo === 'Férias' && !isEditMode) {
      try {
        const anoDaSolicitacao = new Date(formData.data_inicio.replace(/-/g, '/')).getFullYear();
        
        toast.loading('Verificando histórico de férias...');
        const jaTirouFerias = await checkExistingFeriasNoAno(formData.funcionario_id, anoDaSolicitacao);
        toast.dismiss();

        if (jaTirouFerias) {
          toast.error(`Este colaborador já possui férias aprovadas no ano de ${anoDaSolicitacao}.`);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        toast.dismiss();
        toast.error(`Erro ao verificar histórico: ${err.message}`);
        setIsSubmitting(false);
        return;
      }
    }
    // --- FIM DO BLOCO DE VERIFICAÇÃO ---
    
    setIsSubmitting(true);
    let finalAnexoPath = formData.anexo_path || null;

    try {
      if (anexoFile) {
        finalAnexoPath = await uploadAnexoAusencia(anexoFile, formData.funcionario_id);
      }

      const dadosCompletosParaSalvar = {
        ...formData,
        anexo_path: finalAnexoPath,
      };
      
      if (isEditMode) {
        // --- MODO DE ATUALIZAÇÃO ---
        await updateAusencia(idParaEditar, dadosCompletosParaSalvar);
        
        // Invalida os caches para o Mural e o Painel de Saldos atualizarem
        mutate('getHistoricoAusencias');
        mutate('getHistoricoCreditos'); 
        
        toast.success('Ausência atualizada com sucesso!');

      } else {
        // --- MODO DE CRIAÇÃO ---
        const novoLancamentoDoBanco = await createAusencia(dadosCompletosParaSalvar);
        
        // Mutação otimista (UI instantânea)
        mutate('getHistoricoAusencias', (dadosAntigos = []) => {
          const funcInfo = funcionarios?.find(f => f.id === novoLancamentoDoBanco.funcionario_id);
          const novoItemCompleto = {
            ...novoLancamentoDoBanco,
            funcionarios: {
              id: funcInfo?.id,
              nome_completo: funcInfo?.nome_completo || '(Desconhecido)',
              avatar_url: funcInfo?.avatar_url || null
            }
          };
          return [novoItemCompleto, ...dadosAntigos];
        }, { revalidate: false });
        
        // Invalida o cache de saldos
        mutate('getHistoricoCreditos'); 
        
        toast.success('Ausência lançada com sucesso!');
      }

      onClose(); // Fecha o modal

    } catch (err) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching) return <p>Carregando dados da ausência...</p>;
  if (fetchError) return <p className="error-message">Falha ao carregar: {fetchError.message}</p>;

  // --- JSX ---
  return (
    <div className="ausencia-form-container" style={{border: 'none', boxShadow: 'none', padding: 0}}> 
      {isSubmitting && (
        <div className="form-loading-overlay">
          <div className="form-spinner"></div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="ausencia-form-content" style={{padding: 0}}>
          <div className="ausencia-form-grid">
            
            <div className="ausencia-form-group ausencia-form-span-2">
              <label htmlFor="employee">Colaborador *</label>
              <select
                id="employee"
                name="funcionario_id"
                value={formData.funcionario_id}
                onChange={handleChange}
                disabled={isLoadingFuncionarios || !!errorFuncionarios || isEditMode}
                required
              >
                <option value="">
                  {errorFuncionarios ? 'Erro ao carregar...' : (isLoadingFuncionarios ? 'Carregando...' : 'Selecione um colaborador')}
                </option>
                {funcionarios && funcionarios.map((func) => (
                  <option key={func.id} value={func.id}>
                    {func.nome_completo}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="ausencia-form-group">
              <label htmlFor="reason">Motivo da Ausência *</label>
              <select
                id="reason"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                required
              >
                <option value="">Escolha um motivo</option>
                <option value="Férias">Férias</option>
                <option value="Atestado Médico">Atestado Médico</option>
                <option value="Licença Maternidade/Paternidade">Licença Maternidade/Paternidade</option>
                <option value="Licença não remunerada">Licença não remunerada</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="ausencia-form-group">
              <label htmlFor="status">Status *</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="Pendente">Pendente</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Rejeitado">Rejeitado</option>
              </select>
            </div>

            <div className="ausencia-form-group">
              <label htmlFor="start-date">Data de Início *</label>
              <div className="input-with-icon">
                <span className="material-symbols-outlined input-icon">calendar_today</span>
                <input
                  id="start-date"
                  name="data_inicio"
                  type="date"
                  value={formData.data_inicio}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="ausencia-form-group">
                <label htmlFor="end-date">Data de Fim *</label>
                <div className="input-with-icon">
                  <span className="material-symbols-outlined input-icon">calendar_today</span>
                  <input
                    id="end-date"
                    name="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

            <div className="ausencia-form-group ausencia-form-span-2">
              <label htmlFor="dropzone-file">Anexar Documento</label>
              <label className="ausencia-upload-label" htmlFor="dropzone-file">
                  <span className="material-symbols-outlined" style={{fontSize: '40px', color: '#777'}}>cloud_upload</span>
                  {anexoFile ? (
                    <p className="ausencia-file-name">{anexoFile.name}</p>
                  ) : formData.anexo_path ? (
                    <p className="ausencia-file-name">Anexo salvo (clique para trocar)</p>
                  ) : (
                    <>
                      <p className="ausencia-upload-text">
                        <span className="semibold">Clique para enviar</span> ou arraste e solte
                      </p>
                      <p className="ausencia-upload-subtext">PDF, PNG, JPG (MAX. 5MB)</p>
                    </>
                  )}
                <input
                  className="hidden" 
                  id="dropzone-file" 
                  type="file"
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, application/pdf"
                />
              </label>
            </div>

            <div className="ausencia-form-group ausencia-form-span-2">
              <label htmlFor="notes">Observações</label>
              <textarea
                id="notes"
                name="motivo"
                placeholder="Adicione qualquer informação relevante..."
                rows="4"
                value={formData.motivo || ''}
                onChange={handleChange}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="ausencia-form-footer" style={{padding: '16px 0 0 0'}}>
          <button
            type="button"
            className="button-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="button-primary"
            disabled={isSubmitting}
          >
            <span className="material-symbols-outlined button-icon">save</span>
            {isSubmitting ? 'Salvando...' : (isEditMode ? 'Atualizar Lançamento' : 'Salvar Ausência')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LancarAusenciaForm;