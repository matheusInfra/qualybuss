import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { differenceInDays, parseISO } from 'date-fns';
import { getFuncionarios } from '../../services/funcionarioService';
import { createSolicitacaoAusencia, uploadAnexoAusencia, getPeriodosAquisitivos } from '../../services/ausenciaService';
import './LancarAusenciaForm.css'; 

function SolicitacaoAusenciaForm({ onClose }) {
  const { register, handleSubmit, watch, setValue } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const { mutate } = useSWRConfig();

  const selectedFuncionario = watch('funcionario_id');
  const selectedTipo = watch('tipo');
  const dataInicio = watch('data_inicio');
  const dataFim = watch('data_fim');

  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // Carrega períodos e saldo
  useEffect(() => {
    if (selectedFuncionario) {
      getPeriodosAquisitivos(selectedFuncionario).then(data => {
        setPeriodos(data || []);
        const saldo = data
          ?.filter(p => p.status === 'Aberto')
          .reduce((acc, curr) => acc + Number(curr.saldo_atual), 0);
        setSaldoTotal(saldo || 0);
        
        const func = funcionarios?.find(f => f.id === selectedFuncionario);
        if (func) setValue('empresa_id', func.empresa_id);
      });
    }
  }, [selectedFuncionario, funcionarios, setValue]);

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
      if (data.tipo === 'Férias') {
        if (diasCalculados > saldoTotal) throw new Error(`Saldo insuficiente (${saldoTotal} dias).`);
        
        // Tenta alocar no período mais antigo aberto
        const periodoAlvo = periodos.find(p => p.status === 'Aberto' && p.saldo_atual > 0);
        if (periodoAlvo) data.periodo_aquisitivo_id = periodoAlvo.id;
      }

      let anexoPath = null;
      if (data.anexo && data.anexo[0]) {
        anexoPath = await uploadAnexoAusencia(data.anexo[0], data.funcionario_id);
      }

      let categoria = 'Geral';
      if (data.tipo === 'Férias') categoria = 'Ferias';
      else if (data.tipo.includes('Atestado') || data.tipo.includes('Licença')) categoria = 'Saude';
      else if (data.tipo.includes('Pessoal')) categoria = 'Pessoal';

      await createSolicitacaoAusencia({
        ...data,
        quantidade: diasCalculados,
        anexo_path: anexoPath,
        categoria
      });

      toast.success('Solicitação registrada!');
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
            <select {...register('funcionario_id', { required: true })}>
              <option value="">Selecione...</option>
              {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
            </select>
          </div>

          {selectedFuncionario && (
            <div style={{gridColumn: 'span 2', background: '#f0f9ff', padding: '12px', borderRadius: '6px', border: '1px solid #bae6fd'}}>
              <span style={{fontWeight: 600, color: '#0284c7'}}>Saldo de Férias: {saldoTotal} Dias</span>
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

          <div className="ausencia-form-group"><label>Início *</label><input type="date" {...register('data_inicio', { required: true })} /></div>
          <div className="ausencia-form-group"><label>Fim *</label><input type="date" {...register('data_fim', { required: true })} /></div>
          
          <div className="ausencia-form-group"><label>Duração</label><input value={`${diasCalculados} dias`} disabled style={{background: '#eee'}} /></div>

          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Anexo {selectedTipo?.includes('Atestado') && '*'}</label>
            <input type="file" {...register('anexo', { required: selectedTipo?.includes('Atestado') })} />
          </div>

          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Observações</label>
            <textarea {...register('motivo')} rows="2"></textarea>
          </div>
        </div>

        <div className="ausencia-form-footer">
          <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button-primary" disabled={isSubmitting}>Registrar</button>
        </div>
      </form>
    </div>
  );
}

export default SolicitacaoAusenciaForm;