import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { differenceInDays, parseISO, addDays, format, getDay } from 'date-fns';
import { getFuncionarios } from '../../services/funcionarioService';
import { 
  createAusencia, 
  updateAusencia, 
  getAusenciaById, 
  uploadAnexoAusencia, 
  getPeriodosAquisitivos 
} from '../../services/ausenciaService';
import './LancarAusenciaForm.css'; 

function LancarAusenciaForm({ onClose, idParaEditar = null }) {
  const { register, handleSubmit, watch, setValue, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      getAusenciaById(idParaEditar).then(dados => {
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
      });
    }
  }, [idParaEditar, reset]);

  // 2. Carrega saldo
  useEffect(() => {
    if (selectedFuncionario) {
      getPeriodosAquisitivos(selectedFuncionario).then(data => {
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

  // 3. Cálculos Inteligentes e UX
  const stats = useMemo(() => {
    if (!dataInicio || !dataFim) return null;
    
    const start = parseISO(dataInicio);
    const end = parseISO(dataFim);
    const dias = differenceInDays(end, start) + 1;
    
    // Regra Visual: Alerta de Início
    const diaSemana = getDay(start); // 0=Dom
    const inicioRuim = (selectedTipo === 'Férias' && (diaSemana === 0 || diaSemana === 5 || diaSemana === 6));
    
    const dataRetorno = addDays(end, 1);
    const saldoRestante = saldoTotal - dias;
    const porcentagemUso = saldoTotal > 0 ? Math.min((dias / saldoTotal) * 100, 100) : 100;

    return {
      dias: dias > 0 ? dias : 0,
      retorno: format(dataRetorno, 'dd/MM/yyyy'),
      inicioRuim,
      saldoRestante,
      isNegativo: saldoRestante < 0,
      porcentagemUso
    };
  }, [dataInicio, dataFim, selectedTipo, saldoTotal]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      if (data.tipo === 'Férias' && !idParaEditar) {
         if (stats.dias > saldoTotal) throw new Error(`Saldo insuficiente (${saldoTotal} dias).`);
      }

      let anexoPath = null;
      if (data.anexo && data.anexo[0]) {
        anexoPath = await uploadAnexoAusencia(data.anexo[0], data.funcionario_id);
      }

      const payload = {
        ...data,
        quantidade: stats.dias,
        categoria: data.tipo === 'Férias' ? 'Ferias' : (data.tipo.includes('Atestado') ? 'Saude' : 'Pessoal'),
        ...(anexoPath ? { anexo_path: anexoPath } : {})
      };
      delete payload.anexo;

      if (idParaEditar) {
        await updateAusencia(idParaEditar, payload);
        toast.success('Solicitação atualizada!');
      } else {
        if (!anexoPath) payload.anexo_path = null;
        await createAusencia(payload);
        toast.success('Solicitação registrada!');
      }

      mutate('getTodasSolicitacoes'); 
      onClose();
    } catch (err) {
      toast.error(err.message, { duration: 5000 });
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
            <select {...register('funcionario_id', { required: true })} disabled={!!idParaEditar} style={idParaEditar ? {backgroundColor: '#f1f5f9'} : {}}>
              <option value="">Selecione...</option>
              {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
            </select>
          </div>

          {/* BARRA DE PROGRESSO DO SALDO */}
          {selectedFuncionario && selectedTipo === 'Férias' && (
            <div style={{gridColumn: 'span 2', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'6px', fontSize:'0.85rem', color:'#475569'}}>
                <span>Saldo Atual: <strong>{saldoTotal} dias</strong></span>
                {stats?.dias > 0 && (
                  <span style={{color: stats.isNegativo ? '#ef4444' : '#0284c7'}}>
                    Restante: <strong>{stats.saldoRestante} dias</strong>
                  </span>
                )}
              </div>
              <div style={{height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
                <div style={{
                  height: '100%', 
                  width: `${stats?.porcentagemUso || 0}%`, 
                  background: stats?.isNegativo ? '#ef4444' : '#3b82f6',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          )}

          <div className="ausencia-form-group">
            <label>Tipo *</label>
            <select {...register('tipo', { required: true })}>
              <option value="Férias">Férias</option>
              <option value="Atestado Médico">Atestado Médico</option>
              <option value="Licença Paternidade/Maternidade">Licença Paternidade/Maternidade</option>
              <option value="Folga Pessoal">Folga Pessoal</option>
            </select>
          </div>

          <div className="ausencia-form-group"><label>Início *</label><input type="date" {...register('data_inicio', { required: true })} /></div>
          <div className="ausencia-form-group"><label>Fim *</label><input type="date" {...register('data_fim', { required: true })} /></div>
          
          <div className="ausencia-form-group">
            <label>Duração</label>
            <input value={stats?.dias ? `${stats.dias} dias` : '-'} disabled style={{background: '#f1f5f9'}} />
          </div>

          {/* ALERTAS INTELIGENTES */}
          {stats?.inicioRuim && (
             <div style={{gridColumn: 'span 2', padding: '10px', background: '#fff7ed', borderLeft: '4px solid #f97316', color: '#9a3412', fontSize: '0.85rem', borderRadius: '4px'}}>
               ⚠️ <strong>Atenção:</strong> Evite iniciar férias em sextas-feiras ou fins de semana.
             </div>
          )}
          {stats?.dias > 0 && (
             <div style={{gridColumn: 'span 2', marginTop: '-10px', fontSize: '0.9rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'}}>
               <span>🔙</span> Retorno previsto: {stats.retorno}
             </div>
          )}

          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Anexo {selectedTipo?.includes('Atestado') && !idParaEditar && '*'}</label>
            <input type="file" {...register('anexo', { required: (!idParaEditar && selectedTipo?.includes('Atestado')) })} />
          </div>

          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Observações</label>
            <textarea {...register('motivo')} rows="2"></textarea>
          </div>
        </div>

        <div className="ausencia-form-footer">
          <button type="button" className="button-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="button-primary" disabled={isSubmitting || stats?.isNegativo}>
            {idParaEditar ? 'Salvar Alterações' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LancarAusenciaForm;