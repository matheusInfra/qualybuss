import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { differenceInDays, parseISO } from 'date-fns';
import { getFuncionarios } from '../../services/funcionarioService';
import { 
  createAusencia,  // <--- CORREÇÃO AQUI
  updateAusencia, 
  getAusenciaById, 
  uploadAnexoAusencia, 
  getPeriodosAquisitivos 
} from '../../services/ausenciaService';
import './LancarAusenciaForm.css'; 

function LancarAusenciaForm({ onClose, idParaEditar = null }) {
  const { register, handleSubmit, watch, setValue, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const { mutate } = useSWRConfig();

  // Watchers
  const selectedFuncionario = watch('funcionario_id');
  const selectedTipo = watch('tipo');
  const dataInicio = watch('data_inicio');
  const dataFim = watch('data_fim');

  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // 1. MODO EDIÇÃO: Carregar dados
  useEffect(() => {
    if (idParaEditar) {
      const carregarDadosEdicao = async () => {
        try {
          const dados = await getAusenciaById(idParaEditar);
          if (dados) {
            reset({
              funcionario_id: dados.funcionario_id,
              tipo: dados.tipo,
              data_inicio: dados.data_inicio,
              data_fim: dados.data_fim,
              motivo: dados.motivo,
              empresa_id: dados.empresa_id
            });
            toast("Modo de Edição ativado", { icon: '✏️', duration: 2000 });
          }
        } catch (error) {
          console.error(error);
          toast.error("Erro ao carregar dados para edição");
          onClose();
        }
      };
      carregarDadosEdicao();
    }
  }, [idParaEditar, reset, onClose]);

  // 2. Carrega saldo e empresa
  useEffect(() => {
    if (selectedFuncionario) {
      getPeriodosAquisitivos(selectedFuncionario).then(data => {
        setPeriodos(data || []);
        const saldo = data
          ?.filter(p => p.status === 'Aberto')
          .reduce((acc, curr) => acc + Number(curr.saldo_atual), 0);
        setSaldoTotal(saldo || 0);
        
        if (!idParaEditar) {
            const func = funcionarios?.find(f => f.id === selectedFuncionario);
            if (func) setValue('empresa_id', func.empresa_id);
        }
      });
    }
  }, [selectedFuncionario, funcionarios, setValue, idParaEditar]);

  const diasCalculados = useMemo(() => {
    if (dataInicio && dataFim) {
      const diff = differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1;
      return diff > 0 ? diff : 0;
    }
    return 0;
  }, [dataInicio, dataFim]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // Validação de Saldo
      if (data.tipo === 'Férias' && !idParaEditar) {
         if (diasCalculados > saldoTotal) {
             throw new Error(`Saldo insuficiente (${saldoTotal} dias).`);
         }
      }

      // Upload de Anexo
      let anexoPath = null;
      if (data.anexo && data.anexo[0]) {
        anexoPath = await uploadAnexoAusencia(data.anexo[0], data.funcionario_id);
      }

      // Categorização
      let categoria = 'Geral';
      if (data.tipo === 'Férias') categoria = 'Ferias';
      else if (data.tipo.includes('Atestado') || data.tipo.includes('Licença')) categoria = 'Saude';
      else if (data.tipo.includes('Pessoal')) categoria = 'Pessoal';

      const payload = {
        ...data,
        quantidade: diasCalculados,
        categoria,
        ...(anexoPath ? { anexo_path: anexoPath } : {})
      };
      
      delete payload.anexo;

      if (idParaEditar) {
        await updateAusencia(idParaEditar, payload);
        toast.success('Solicitação atualizada!');
      } else {
        if (!anexoPath) payload.anexo_path = null; 
        
        // <--- CORREÇÃO AQUI: Usando createAusencia
        await createAusencia(payload);
        toast.success('Solicitação registrada!');
      }

      mutate('getTodasSolicitacoes'); 
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ausencia-form-container" style={{border:'none', boxShadow:'none', padding:0}}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="ausencia-form-grid">
          
          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Colaborador *</label>
            <select 
                {...register('funcionario_id', { required: true })} 
                disabled={!!idParaEditar} 
                style={idParaEditar ? {backgroundColor: '#f1f5f9', cursor: 'not-allowed'} : {}}
            >
              <option value="">Selecione...</option>
              {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
            </select>
          </div>

          {selectedFuncionario && (
            <div style={{gridColumn: 'span 2', background: '#f0f9ff', padding: '12px', borderRadius: '6px', border: '1px solid #bae6fd'}}>
              <span style={{fontWeight: 600, color: '#0284c7'}}>Saldo de Férias Disponível: {saldoTotal} Dias</span>
            </div>
          )}

          <div className="ausencia-form-group">
            <label>Tipo *</label>
            <select {...register('tipo', { required: true })}>
              <option value="Férias">Férias</option>
              <option value="Atestado Médico">Atestado Médico</option>
              <option value="Licença Paternidade/Maternidade">Licença Paternidade/Maternidade</option>
              <option value="Folga Pessoal">Folga Pessoal</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="ausencia-form-group">
            <label>Início *</label>
            <input type="date" {...register('data_inicio', { required: true })} />
          </div>
          
          <div className="ausencia-form-group">
            <label>Fim *</label>
            <input type="date" {...register('data_fim', { required: true })} />
          </div>
          
          <div className="ausencia-form-group">
            <label>Duração</label>
            <input value={`${diasCalculados} dias`} disabled style={{background: '#eee'}} />
          </div>

          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Anexo {selectedTipo?.includes('Atestado') && !idParaEditar && '*'}</label>
            <input 
              type="file" 
              {...register('anexo', { required: (!idParaEditar && selectedTipo?.includes('Atestado')) })} 
            />
            {idParaEditar && <small style={{color:'#64748b', display:'block', marginTop:'4px'}}>Deixe vazio para manter o anexo atual.</small>}
          </div>

          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Observações</label>
            <textarea {...register('motivo')} rows="2"></textarea>
          </div>
        </div>

        <div className="ausencia-form-footer">
          <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button-primary" disabled={isSubmitting}>
            {idParaEditar ? 'Salvar Alterações' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LancarAusenciaForm;