import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { differenceInDays, parseISO, addDays, format } from 'date-fns';
// CORREÇÃO: Importamos a função de dropdown
import { getFuncionariosDropdown } from '../../services/funcionarioService';
import { 
  solicitarAusencia, 
  lancarCredito, 
  getResumoSaldos,
  uploadAnexoAusencia 
} from '../../services/ausenciaService';
import './FormularioMovimentacao.css';

function FormularioMovimentacao({ onClose, idParaEditar = null }) {
  const [modo, setModo] = useState('saida'); // 'saida' (Uso) ou 'entrada' (Ganho)
  const { register, handleSubmit, watch, setValue, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saldos, setSaldos] = useState(null);
  const { mutate } = useSWRConfig();

  // Watchers
  const selectedFuncionario = watch('funcionario_id');
  const tipoSelecionado = watch('tipo');
  const dataInicio = watch('data_inicio');
  const dataFim = watch('data_fim');
  const qtdInput = watch('quantidade_manual'); 

  // CORREÇÃO: Usamos a chave e função corretas para buscar a lista simples
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  // Carrega Saldos
  useEffect(() => {
    if (selectedFuncionario) {
      getResumoSaldos(selectedFuncionario).then(setSaldos);
    } else {
      setSaldos(null);
    }
  }, [selectedFuncionario, modo]);

  // Cálculos Inteligentes
  const stats = useMemo(() => {
    if (!dataInicio) return null;
    
    // Define unidade
    const unidade = tipoSelecionado === 'Banco de Horas' ? 'horas' : 'dias';

    // Lógica de Quantidade:
    let qtdFinal = 0;
    
    if (qtdInput) {
        qtdFinal = parseFloat(qtdInput);
    } else {
        if (dataFim) {
            qtdFinal = differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1;
        } else {
            qtdFinal = 1; // Padrão 1 dia se não tiver fim
        }
    }

    // Projeção de Saldo (Apenas para SAÍDA)
    let saldoAtual = 0;
    let saldoRestante = 0;
    let hasSaldo = true;

    if (modo === 'saida' && saldos) {
      if (tipoSelecionado === 'Férias') saldoAtual = saldos.ferias.saldo;
      else if (tipoSelecionado === 'Banco de Horas') saldoAtual = parseFloat(saldos.banco_horas.saldo);
      else if (tipoSelecionado === 'Folga Pessoal') saldoAtual = saldos.folgas.saldo;
      
      saldoRestante = saldoAtual - qtdFinal;
      // Validação rígida apenas para Férias
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
    if (!data.funcionario_id) {
      toast.error("Selecione um colaborador.");
      return;
    }

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
        // --- PROCESSO DE SAÍDA (DÉBITO) ---
        if (data.tipo === 'Férias' && !stats.hasSaldo) {
            throw new Error(`Saldo insuficiente (${stats.saldoAtual} dias).`);
        }
        
        payload.data_fim = data.data_fim; // Obrigatório para saída
        
        // Upload Anexo
        if (data.anexo && data.anexo[0]) {
          payload.anexo_path = await uploadAnexoAusencia(data.anexo[0], data.funcionario_id);
        }

        await solicitarAusencia(payload);
        toast.success("Solicitação enviada!");

      } else {
        // --- PROCESSO DE ENTRADA (CRÉDITO) ---
        
        // Se for Crédito de Férias (Período Aquisitivo), precisamos da data fim do período
        if (data.tipo === 'Férias') {
            if (!data.data_fim) throw new Error("Informe a Data Final do Período Aquisitivo.");
            payload.data_fim = data.data_fim;
        } else {
            // Para outros créditos, data fim é igual início (evento pontual)
            payload.data_fim = data.data_inicio;
        }

        await lancarCredito(payload);
        toast.success("Crédito lançado com sucesso!");
      }

      mutate('getMuralRecente'); 
      mutate('getSolicitacoesPendentes');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lógica de Exibição de Campos
  const showDataFim = modo === 'saida' || (modo === 'entrada' && tipoSelecionado === 'Férias');
  const showManualInput = tipoSelecionado === 'Banco de Horas' || (modo === 'entrada' && tipoSelecionado === 'Férias') || (modo === 'entrada' && tipoSelecionado === 'Folga');

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
            {/* O map agora funciona pois 'funcionarios' é um array garantido */}
            {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
          </select>
        </div>

        {/* FEEDBACK VISUAL DE SALDOS */}
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
                  <option value="Folga">Folga Compensatória</option>
                  <option value="Férias">Período Aquisitivo (Novo)</option>
                </>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>Data {modo === 'saida' ? 'Início' : (tipoSelecionado === 'Férias' ? 'Início Período' : 'do Evento')}</label>
            <input type="date" {...register('data_inicio', { required: true })} />
          </div>
        </div>

        {/* Campos Condicionais */}
        <div className="form-row">
          {showDataFim && (
            <div className="form-group">
              <label>Data {tipoSelecionado === 'Férias' && modo === 'entrada' ? 'Fim Período' : 'Fim'}</label>
              <input type="date" {...register('data_fim', { required: true })} />
            </div>
          )}
          
          <div className="form-group info-box">
            <label>
               {modo === 'entrada' ? 'A Creditar' : 'Duração Calculada'}
            </label>
            <div className="value-display">{stats?.qtd || 0} {stats?.unidade}</div>
          </div>
        </div>

        {/* Input Manual: Aparece para Banco de Horas OU Cadastro de Período Aquisitivo */}
        {showManualInput && (
          <div className="form-group highlight">
            <label>
              {tipoSelecionado === 'Férias' ? 'Dias de Direito (Ex: 30)' : 'Quantidade Manual'}
            </label>
            <input 
              type="number" 
              step="0.1" 
              placeholder={tipoSelecionado === 'Férias' ? "30" : "Ex: 1.5"} 
              {...register('quantidade_manual')} 
            />
            {tipoSelecionado === 'Banco de Horas' && <small>Use ponto para minutos (Ex: 1.5 = 1h30min)</small>}
          </div>
        )}

        {/* Alerta de Saldo */}
        {modo === 'saida' && stats && !stats.hasSaldo && (
          <div className="alert-error">
            ⚠️ Saldo insuficiente! Você tem {stats.saldoAtual} e quer usar {stats.qtd}.
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