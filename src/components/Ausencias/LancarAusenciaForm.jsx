import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { differenceInDays, parseISO, addDays, format } from 'date-fns'; // Removido getDay não usado
// CORREÇÃO: Usamos a versão Dropdown
import { getFuncionariosDropdown } from '../../services/funcionarioService';
import { 
  createAusencia, 
  updateAusencia, 
  getAusenciaById, 
  uploadAnexoAusencia, 
  getPeriodosAquisitivos,
  validarRegrasCLT
} from '../../services/ausenciaService';
import './LancarAusenciaForm.css'; 

function LancarAusenciaForm({ onClose, idParaEditar = null }) {
  const { register, handleSubmit, watch, setValue, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const { mutate } = useSWRConfig();

  const selectedFuncionario = watch('funcionario_id');
  const selectedTipo = watch('tipo');
  const dataInicio = watch('data_inicio');
  const dataFim = watch('data_fim');

  // CORREÇÃO: Hook SWR atualizado para a função correta
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  // Carrega dados para edição
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
          toast("Modo de Edição: Você está alterando um registro existente.", { icon: '✏️' });
        }
      });
    }
  }, [idParaEditar, reset]);

  // Carrega saldo do funcionário selecionado
  useEffect(() => {
    if (selectedFuncionario) {
      getPeriodosAquisitivos(selectedFuncionario).then(data => {
        const saldo = data
          ?.filter(p => p.status === 'Aberto')
          .reduce((acc, curr) => acc + (Number(curr.dias_direito) - Number(curr.dias_gozados || 0)), 0);
        setSaldoTotal(saldo || 0);
        
        if (!idParaEditar) {
            // Aqui buscamos a empresa_id do objeto retornado pelo dropdown
            const func = funcionarios?.find(f => f.id === selectedFuncionario);
            if (func?.empresa_id) setValue('empresa_id', func.empresa_id);
        }
      });
    }
  }, [selectedFuncionario, funcionarios, setValue, idParaEditar]);

  // Cálculos em tempo real (Stats)
  const stats = useMemo(() => {
    if (!dataInicio || !dataFim) return null;
    
    const start = parseISO(dataInicio);
    const end = parseISO(dataFim);
    const dias = differenceInDays(end, start) + 1;
    
    // Validação Visual da Regra CLT
    const validacaoCLT = validarRegrasCLT(dataInicio);
    const inicioRuim = !validacaoCLT.valido && validacaoCLT.bloqueante;
    const msgRuim = validacaoCLT.mensagem;
    
    const dataRetorno = addDays(end, 1);
    
    // Se for Férias, abate do saldo. Se for outro tipo, não impacta visualmente o saldo aqui.
    const saldoRestante = selectedTipo === 'Férias' ? saldoTotal - dias : saldoTotal;
    const isNegativo = selectedTipo === 'Férias' && saldoRestante < 0;
    
    const porcentagemUso = saldoTotal > 0 ? Math.min((dias / saldoTotal) * 100, 100) : 100;

    return {
      dias: dias > 0 ? dias : 0,
      retorno: format(dataRetorno, 'dd/MM/yyyy'),
      inicioRuim,
      msgRuim,
      saldoRestante,
      isNegativo,
      porcentagemUso
    };
  }, [dataInicio, dataFim, selectedTipo, saldoTotal]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      // 1. Validação de Saldo (Apenas para Férias)
      if (data.tipo === 'Férias') {
         if (!idParaEditar && stats.dias > saldoTotal) {
           throw new Error(`Saldo insuficiente! O colaborador tem apenas ${saldoTotal} dias.`);
         }
      }

      // 2. Validação Rígida CLT (Precedente 100 TST)
      if (data.tipo === 'Férias' && stats?.inicioRuim) {
        const confirmacao = window.confirm(
          `⚠️ ALERTA DE RISCO TRABALHISTA ⚠️\n\n${stats.msgRuim}\n\nIniciar férias nesta data pode gerar passivo jurídico para a empresa.\n\nDeseja prosseguir mesmo assim?`
        );
        if (!confirmacao) {
          setIsSubmitting(false);
          return;
        }
      }

      // 3. Upload de Anexo
      let anexoPath = null;
      if (data.anexo && data.anexo[0]) {
        anexoPath = await uploadAnexoAusencia(data.anexo[0], data.funcionario_id);
      }

      // 4. Montagem do Payload
      const payload = {
        ...data,
        quantidade: stats.dias,
        // Define categoria para relatórios
        categoria: data.tipo === 'Férias' ? 'Ferias' : (data.tipo.includes('Atestado') ? 'Saude' : 'Pessoal'),
        ...(anexoPath ? { anexo_path: anexoPath } : {})
      };
      delete payload.anexo; // Remove o objeto File do payload JSON

      // 5. Envio ao Backend
      if (idParaEditar) {
        await updateAusencia(idParaEditar, payload);
        toast.success('Solicitação atualizada com sucesso!');
      } else {
        if (!anexoPath) payload.anexo_path = null;
        await createAusencia(payload);
        toast.success('Ausência registrada!');
      }

      // 6. Atualiza dados globais e fecha
      mutate('getTodasSolicitacoes'); 
      onClose();

    } catch (err) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ausencia-form-container">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="ausencia-form-grid">
          
          {/* SELEÇÃO DE COLABORADOR */}
          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Colaborador *</label>
            <select 
              {...register('funcionario_id', { required: "Selecione um colaborador" })} 
              disabled={!!idParaEditar} 
              className={idParaEditar ? 'input-disabled' : ''}
            >
              <option value="">Selecione...</option>
              {/* O map agora funciona pois 'funcionarios' é um array garantido */}
              {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
            </select>
          </div>

          {/* BARRA DE SALDO (Apenas Férias) */}
          {selectedFuncionario && selectedTipo === 'Férias' && (
            <div className="saldo-bar-container">
              <div className="saldo-info">
                <span>Disponível: <strong>{saldoTotal} dias</strong></span>
                {stats?.dias > 0 && (
                  <span className={stats.isNegativo ? 'text-danger' : 'text-primary'}>
                    Após saída: <strong>{stats.saldoRestante} dias</strong>
                  </span>
                )}
              </div>
              <div className="progress-bg">
                <div 
                  className="progress-fill"
                  style={{
                    width: `${stats?.porcentagemUso || 0}%`, 
                    backgroundColor: stats?.isNegativo ? '#ef4444' : '#3b82f6'
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* TIPO DE AUSÊNCIA */}
          <div className="ausencia-form-group">
            <label>Tipo *</label>
            <select {...register('tipo', { required: true })}>
              <option value="Férias">Férias</option>
              <option value="Atestado Médico">Atestado Médico</option>
              <option value="Licença Paternidade/Maternidade">Licença Paternidade/Maternidade</option>
              <option value="Folga Pessoal">Folga Pessoal</option>
              <option value="Banco de Horas">Banco de Horas</option>
            </select>
          </div>

          {/* DATAS */}
          <div className="ausencia-form-group">
            <label>Início *</label>
            <input type="date" {...register('data_inicio', { required: true })} />
          </div>
          <div className="ausencia-form-group">
            <label>Fim *</label>
            <input type="date" {...register('data_fim', { required: true })} />
          </div>
          
          {/* DURAÇÃO (Read Only) */}
          <div className="ausencia-form-group">
            <label>Duração</label>
            <input 
              value={stats?.dias ? `${stats.dias} dias` : '-'} 
              disabled 
              className="input-readonly" 
            />
          </div>

          {/* ALERTAS VISUAIS */}
          {stats?.inicioRuim && selectedTipo === 'Férias' && (
             <div className="alert-warning">
               {stats.msgRuim}
             </div>
          )}
          
          {stats?.dias > 0 && (
             <div className="info-retorno">
               <span>📅</span> Retorno previsto: <strong>{stats.retorno}</strong>
             </div>
          )}

          {/* ANEXO */}
          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>
              Anexo 
              {selectedTipo?.includes('Atestado') && !idParaEditar && <span className="required-mark">* (Obrigatório para Saúde)</span>}
            </label>
            <input 
              type="file" 
              {...register('anexo', { required: (!idParaEditar && selectedTipo?.includes('Atestado')) })} 
            />
          </div>

          {/* OBSERVAÇÕES */}
          <div className="ausencia-form-group" style={{gridColumn: 'span 2'}}>
            <label>Observações</label>
            <textarea {...register('motivo')} rows="2" placeholder="Descreva o motivo ou detalhes adicionais..."></textarea>
          </div>
        </div>

        {/* RODAPÉ / BOTÕES */}
        <div className="ausencia-form-footer">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button 
            type="submit" 
            className="button-primary" 
            disabled={isSubmitting || (selectedTipo === 'Férias' && stats?.isNegativo && !idParaEditar)}
          >
            {isSubmitting ? 'Salvando...' : (idParaEditar ? 'Salvar Alterações' : 'Registrar Solicitação')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default LancarAusenciaForm;