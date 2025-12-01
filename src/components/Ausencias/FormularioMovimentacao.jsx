import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { differenceInDays, parseISO, addDays, format, getDay } from 'date-fns';
import { getFuncionarios } from '../../services/funcionarioService';
import { 
  solicitarAusencia, 
  lancarCredito, 
  getResumoSaldos,
  uploadAnexoAusencia 
} from '../../services/ausenciaService';
import './FormularioMovimentacao.css'; // Criaremos este CSS

function FormularioMovimentacao({ onClose, idParaEditar = null }) {
  const [modo, setModo] = useState('saida'); // 'saida' (Débito) ou 'entrada' (Crédito)
  const { register, handleSubmit, watch, setValue, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saldos, setSaldos] = useState(null);
  const { mutate } = useSWRConfig();

  // Watchers
  const selectedFuncionario = watch('funcionario_id');
  const tipoSelecionado = watch('tipo');
  const dataInicio = watch('data_inicio');
  const dataFim = watch('data_fim');
  const qtdInput = watch('quantidade_manual'); // Para Banco de Horas

  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // Carrega Saldos em Tempo Real
  useEffect(() => {
    if (selectedFuncionario) {
      getResumoSaldos(selectedFuncionario).then(setSaldos);
    } else {
      setSaldos(null);
    }
  }, [selectedFuncionario, modo]); // Recarrega se mudar o funcionário

  // Cálculos Inteligentes
  const stats = useMemo(() => {
    if (!dataInicio) return null;
    
    // Cálculo de Dias
    let dias = 0;
    if (dataFim) {
      dias = differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1;
    } else {
      dias = 1; // Padrão se não tiver data fim
    }

    // Se for Banco de Horas, usa o input manual
    const qtdFinal = tipoSelecionado === 'Banco de Horas' ? parseFloat(qtdInput || 0) : dias;
    const unidade = tipoSelecionado === 'Banco de Horas' ? 'horas' : 'dias';

    // Projeção de Saldo (Apenas para SAÍDA)
    let saldoAtual = 0;
    let saldoRestante = 0;
    let hasSaldo = true;

    if (modo === 'saida' && saldos) {
      if (tipoSelecionado === 'Férias') saldoAtual = saldos.ferias.saldo;
      else if (tipoSelecionado === 'Banco de Horas') saldoAtual = parseFloat(saldos.banco_horas.saldo);
      else if (tipoSelecionado === 'Folga Pessoal') saldoAtual = saldos.folgas.saldo;
      
      saldoRestante = saldoAtual - qtdFinal;
      // Banco de horas pode ficar negativo? Depende da política. Vamos alertar.
      if (tipoSelecionado === 'Férias' && saldoRestante < 0) hasSaldo = false;
    }

    return {
      qtd: qtdFinal,
      unidade,
      saldoAtual,
      saldoRestante: saldoRestante.toFixed(1),
      hasSaldo,
      retorno: dataFim ? format(addDays(parseISO(dataFim), 1), 'dd/MM/yyyy') : '-'
    };
  }, [dataInicio, dataFim, qtdInput, tipoSelecionado, saldos, modo]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        funcionario_id: data.funcionario_id,
        tipo: data.tipo,
        data_inicio: data.data_inicio,
        motivo: data.motivo,
        unidade: stats.unidade,
        quantidade: stats.qtd
      };

      if (modo === 'saida') {
        // Regras de Bloqueio
        if (data.tipo === 'Férias' && !stats.hasSaldo) throw new Error(`Saldo insuficiente (${stats.saldoAtual} dias).`);
        
        payload.data_fim = data.data_fim; // Apenas saída tem intervalo
        
        // Upload Anexo
        if (data.anexo && data.anexo[0]) {
          payload.anexo_path = await uploadAnexoAusencia(data.anexo[0], data.funcionario_id);
        }

        await solicitarAusencia(payload);
        toast.success("Solicitação enviada!");
      } else {
        // Entrada (Crédito)
        payload.data_fim = data.data_inicio; // Crédito pontual
        await lancarCredito(payload);
        toast.success("Crédito lançado com sucesso!");
      }

      mutate('getMuralRecente'); 
      mutate('getSolicitacoesPendentes');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="movimentacao-modal">
      <div className="movimentacao-header">
        <button 
          className={`tab-toggle ${modo === 'saida' ? 'active saida' : ''}`}
          onClick={() => setModo('saida')}
        >
          📤 Registrar Saída (Uso)
        </button>
        <button 
          className={`tab-toggle ${modo === 'entrada' ? 'active entrada' : ''}`}
          onClick={() => setModo('entrada')}
        >
          📥 Registrar Entrada (Ganho)
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="movimentacao-form">
        
        {/* Seleção de Funcionário */}
        <div className="form-group">
          <label>Colaborador</label>
          <select {...register('funcionario_id', { required: true })}>
            <option value="">Selecione...</option>
            {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
          </select>
        </div>

        {/* FEEDBACK VISUAL DE SALDOS (O "Dashboard" do Form) */}
        {selectedFuncionario && saldos && (
          <div className="saldos-mini-dashboard">
            <div className={`saldo-pill ${tipoSelecionado === 'Férias' ? 'active' : ''}`}>
              <span className="icon">🏖️</span>
              <div className="info">
                <small>Férias</small>
                <strong>{saldos.ferias.saldo} dias</strong>
              </div>
            </div>
            <div className={`saldo-pill ${tipoSelecionado === 'Banco de Horas' ? 'active' : ''}`}>
              <span className="icon">⏱️</span>
              <div className="info">
                <small>Banco Horas</small>
                <strong>{saldos.banco_horas.saldo}h</strong>
              </div>
            </div>
            <div className={`saldo-pill ${tipoSelecionado === 'Folga Pessoal' ? 'active' : ''}`}>
              <span className="icon">📅</span>
              <div className="info">
                <small>Folgas</small>
                <strong>{saldos.folgas.saldo} dias</strong>
              </div>
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Tipo de {modo === 'saida' ? 'Ausência' : 'Crédito'}</label>
            <select {...register('tipo', { required: true })}>
              {modo === 'saida' ? (
                <>
                  <option value="Férias">Férias</option>
                  <option value="Banco de Horas">Banco de Horas (Saída)</option>
                  <option value="Folga Pessoal">Uso de Folga (Day Off)</option>
                  <option value="Atestado Médico">Atestado Médico</option>
                  <option value="Outro">Outro (Falta, Licença)</option>
                </>
              ) : (
                <>
                  <option value="Banco de Horas">Hora Extra (Banco)</option>
                  <option value="Folga">Folga Compensatória (Trabalho Feriado)</option>
                  <option value="Férias">Direito de Férias (Aquisitivo)</option>
                </>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Data {modo === 'saida' ? 'Início' : 'do Evento'}</label>
            <input type="date" {...register('data_inicio', { required: true })} />
          </div>
        </div>

        {/* Campos Condicionais */}
        {modo === 'saida' && (
          <div className="form-row">
            <div className="form-group">
              <label>Data Fim</label>
              <input type="date" {...register('data_fim', { required: true })} />
            </div>
            <div className="form-group info-box">
              <label>Duração Calculada</label>
              <div className="value-display">{stats?.qtd || 0} {stats?.unidade}</div>
            </div>
          </div>
        )}

        {/* Input Manual para Banco de Horas */}
        {(tipoSelecionado === 'Banco de Horas' || modo === 'entrada') && tipoSelecionado !== 'Férias' && tipoSelecionado !== 'Folga' && (
          <div className="form-group highlight">
            <label>Quantidade de Horas</label>
            <input type="number" step="0.1" placeholder="Ex: 1.5" {...register('quantidade_manual')} />
            <small>Use ponto para minutos (Ex: 1.5 = 1h30min)</small>
          </div>
        )}

        {/* Alerta de Saldo */}
        {modo === 'saida' && stats && !stats.hasSaldo && (
          <div className="alert-error">
            ⚠️ Saldo insuficiente! Você tem {stats.saldoAtual} e quer usar {stats.qtd}.
          </div>
        )}

        {modo === 'saida' && stats && stats.saldoRestante >= 0 && tipoSelecionado !== 'Atestado Médico' && (
          <div className="alert-info">
            📊 Saldo após uso: <strong>{stats.saldoRestante} {stats.unidade}</strong>
          </div>
        )}

        <div className="form-group">
          <label>Justificativa / Motivo</label>
          <textarea rows="2" {...register('motivo', { required: true })}></textarea>
        </div>

        {modo === 'saida' && (
          <div className="form-group">
            <label>Anexo (Opcional)</label>
            <input type="file" {...register('anexo')} />
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-cancel">Cancelar</button>
          <button type="submit" className="btn-confirm" disabled={isSubmitting || (modo==='saida' && !stats?.hasSaldo)}>
            {isSubmitting ? 'Processando...' : (modo === 'saida' ? 'Solicitar' : 'Lançar Crédito')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FormularioMovimentacao;