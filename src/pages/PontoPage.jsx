import React, { useState, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

// Serviços
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { parseArquivoPonto } from '../utils/pontoParser';
import { calcularSaldoDia } from '../utils/calculadoraPonto';
import { 
  salvarImportacaoPonto, 
  getJornadas, 
  createJornada, 
  vincularJornada, 
  getEspelhoPonto, 
  updatePontoDia, 
  fecharMesPonto 
} from '../services/pontoService';

import './PontoPage.css';

export default function PontoPage() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false); // Modal de Configuração em vez de Aba
  
  // Filtros
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Dados
  const [espelhoData, setEspelhoData] = useState([]);
  const [diaEmEdicao, setDiaEmEdicao] = useState(null);

  // Configuração de Jornada (Estados do Modal)
  const [novaJornada, setNovaJornada] = useState({ descricao: '', entrada_1: '08:00', saida_1: '12:00', entrada_2: '13:00', saida_2: '17:00' });
  const [vinculo, setVinculo] = useState({ funcionarioId: '', jornadaId: '' });

  // Refs
  const fileInputRef = useRef(null);

  // Hooks SWR
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);
  const { data: jornadas, mutate: mutateJornadas } = useSWR('getJornadas', getJornadas);

  // --- CARGA INICIAL ---
  const carregarEspelho = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesReferencia.split('-');
      const dados = await getEspelhoPonto(selectedFuncionario || null, parseInt(mes), parseInt(ano));
      setEspelhoData(dados || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEspelho();
  }, [mesReferencia, selectedFuncionario]);

  // --- KPIS CALCULADOS (MEMO) ---
  const kpis = useMemo(() => {
    if (!espelhoData.length) return { total: 0, erros: 0, extras: '00:00', atrasos: '00:00' };
    let countErros = 0, minExtras = 0, minAtrasos = 0;

    espelhoData.forEach(dia => {
      // Verifica status de erro ou falta de batidas
      if (['Falta', 'Incompleto', 'Sem Jornada', 'Erro'].some(st => dia.status?.includes(st))) countErros++;
      if ((dia.saldo_minutos || 0) > 0) minExtras += dia.saldo_minutos;
      if ((dia.saldo_minutos || 0) < 0) minAtrasos += Math.abs(dia.saldo_minutos);
    });

    const formatMin = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
    return { 
      total: espelhoData.length, 
      erros: countErros, 
      extras: formatMin(minExtras), 
      atrasos: formatMin(minAtrasos) 
    };
  }, [espelhoData]);

  // --- FLUXO INTELIGENTE DE IMPORTAÇÃO (ONE-CLICK) ---
  const handleSmartImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const toastId = toast.loading("Analisando arquivo e calculando...");
    setLoading(true);

    try {
      // 1. Ler Arquivo
      const dadosBrutos = await parseArquivoPonto(file);
      
      // 2. Agrupar em Memória
      const resumoMap = {}; 
      const listaBatidas = [];

      dadosBrutos.forEach(b => {
        // Tenta achar funcionário pelo PIS (Obrigatório pois o arquivo só tem PIS)
        const func = funcionarios?.find(f => f.pis && f.pis.replace(/\D/g,'') === b.pis);
        
        // Prepara objeto de batida para salvar
        const batidaPronta = {
          ...b,
          funcionario_id: func?.id || null,
          nome: func?.nome_completo || 'Desconhecido',
          jornada_id: func?.jornada_id 
        };
        listaBatidas.push(batidaPronta);

        // Se achou funcionário, agrupa para o espelho
        if (func && b.data_hora) {
          const dataStr = b.data_hora.split('T')[0];
          const key = `${func.id}_${dataStr}`;
          
          if (!resumoMap[key]) {
            resumoMap[key] = { 
              funcionario_id: func.id, 
              data: dataStr, 
              batidas: [],
              jornada_id: func.jornada_id
            };
          }
          resumoMap[key].batidas.push(b);
        }
      });

      // 3. Calcular Espelho (Inteligência)
      const listaResumo = Object.values(resumoMap).map(item => {
        // Busca jornada específica do funcionário ou a primeira do sistema (fallback)
        const jornada = jornadas?.find(j => j.id === item.jornada_id) || jornadas?.[0];
        
        // Calcula usando a lógica central
        const calculo = calcularSaldoDia(item.batidas, jornada);
        const horarios = calculo.batidasFormatadas || [];

        return {
          funcionario_id: item.funcionario_id,
          data: item.data,
          entrada_1: horarios[0] || null,
          saida_1: horarios[1] || null,
          entrada_2: horarios[2] || null,
          saida_2: horarios[3] || null,
          horas_trabalhadas: calculo.trabalhado || 0,
          saldo_minutos: calculo.saldo || 0,
          status: calculo.status || 'Erro'
        };
      });

      if (listaResumo.length === 0) {
        toast.error("Nenhum funcionário vinculado. Verifique se os PIS estão cadastrados.", { id: toastId });
        setLoading(false);
        return;
      }

      // 4. Salvar tudo no Banco
      await salvarImportacaoPonto({
        nome_arquivo: file.name,
        periodo_referencia: mesReferencia
      }, listaBatidas, listaResumo);

      // 5. Atualizar Interface
      toast.success(`${listaResumo.length} dias processados com sucesso!`, { id: toastId });
      
      // Delay curto para garantir consistência do banco
      setTimeout(() => carregarEspelho(), 800);

    } catch (err) {
      console.error(err);
      toast.error("Falha na importação: " + err.message, { id: toastId });
    } finally {
      setLoading(false);
      // Limpa o input para permitir selecionar o mesmo arquivo novamente se precisar
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- AÇÕES DE TRATAMENTO ---
  const handleSalvarEdicaoDia = async (e) => {
    e.preventDefault();
    try {
      const jornadaAtiva = jornadas?.find(j => j.id === diaEmEdicao.funcionarios?.jornada_id) || jornadas?.[0];
      await updatePontoDia(diaEmEdicao.id, {
        entrada_1: diaEmEdicao.entrada_1,
        saida_1: diaEmEdicao.saida_1,
        entrada_2: diaEmEdicao.entrada_2,
        saida_2: diaEmEdicao.saida_2,
        observacao: diaEmEdicao.observacao,
        status: diaEmEdicao.status
      }, jornadaAtiva);
      
      toast.success("Dia ajustado!");
      setDiaEmEdicao(null);
      carregarEspelho();
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  const handleFecharMes = async () => {
    if (!selectedFuncionario) return toast.error("Selecione um colaborador para fechar.");
    if (kpis.erros > 0) {
      if(!window.confirm(`Atenção: Existem ${kpis.erros} pendências. Fechar assim mesmo?`)) return;
    }
    
    const tid = toast.loading("Fechando mês...");
    try {
      await fecharMesPonto(selectedFuncionario, mesReferencia);
      toast.success("Mês fechado e enviado para Folha!", { id: tid });
    } catch (err) {
      toast.error("Erro: " + err.message, { id: tid });
    }
  };

  // --- CONFIGURAÇÕES (Jornadas) ---
  const handleCriarJornada = async () => {
    try { await createJornada(novaJornada); mutateJornadas(); toast.success("Jornada criada!"); } catch(e){ toast.error("Erro"); }
  };
  const handleVincular = async () => {
    try { await vincularJornada(vinculo.funcionarioId, vinculo.jornadaId); toast.success("Vínculo salvo!"); } catch(e){ toast.error("Erro"); }
  };

  return (
    <div className="ponto-container">
      {/* 1. HEADER MODERNO */}
      <div className="ponto-header">
        <div className="ponto-title">
          <h1>Gestão de Ponto</h1>
          <p>Importe o arquivo AFD e trate as exceções diretamente.</p>
        </div>
        <div className="header-actions">
          {/* BOTÃO PRINCIPAL DE IMPORTAÇÃO */}
          <div className="import-wrapper">
            <input 
              type="file" 
              accept=".txt" 
              style={{display: 'none'}} 
              ref={fileInputRef}
              onChange={handleSmartImport}
            />
            <button 
              className="btn-primary-large" 
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
            >
              {loading ? <span className="loader-spinner"></span> : <span className="material-symbols-outlined">upload_file</span>}
              {loading ? 'Processando...' : 'Importar Arquivo de Ponto'}
            </button>
          </div>

          <button className="btn-icon-secondary" onClick={() => setShowConfig(true)} title="Configurar Jornadas">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS */}
      <div className="ponto-filters">
        <div className="filter-group">
          <label>Mês de Referência</label>
          <input type="month" className="filter-input" value={mesReferencia} onChange={e=>setMesReferencia(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Colaborador</label>
          <select className="filter-input" value={selectedFuncionario} onChange={e=>setSelectedFuncionario(e.target.value)}>
            <option value="">Todos os Colaboradores</option>
            {funcionarios?.map(f => (
              <option key={f.id} value={f.id}>{f.nome_completo}</option>
            ))}
          </select>
        </div>
        <div className="filter-group" style={{flex: 2}}>
          <label>Buscar</label>
          <input className="filter-input" placeholder="Nome ou matrícula..." value={buscaTexto} onChange={e=>setBuscaTexto(e.target.value)} />
        </div>
      </div>

      {/* 3. CARDS DE RESUMO (KPIs) */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">calendar_month</span></div>
          <div className="kpi-content"><span className="kpi-label">Dias Processados</span><span className="kpi-value">{kpis.total}</span></div>
        </div>
        <div className="kpi-card yellow">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">warning</span></div>
          <div className="kpi-content"><span className="kpi-label">Atenção / Erros</span><span className="kpi-value">{kpis.erros}</span></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">add_circle</span></div>
          <div className="kpi-content"><span className="kpi-label">Banco (Crédito)</span><span className="kpi-value">+{kpis.extras}</span></div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">remove_circle</span></div>
          <div className="kpi-content"><span className="kpi-label">Banco (Débito)</span><span className="kpi-value">-{kpis.atrasos}</span></div>
        </div>
      </div>

      {/* 4. TABELA DE TRATAMENTO */}
      <div className="ponto-table-wrapper">
        {loading && <div className="loading-overlay">Processando...</div>}
        
        {espelhoData.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">description</span>
            <p>Nenhum dado para exibir. Importe um arquivo AFD para começar.</p>
          </div>
        ) : (
          <table className="ponto-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Colaborador</th>
                <th>Jornada Realizada</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {espelhoData
                .filter(d => !buscaTexto || d.funcionarios?.nome_completo.toLowerCase().includes(buscaTexto.toLowerCase()))
                .map(dia => (
                <tr key={dia.id} className={dia.status === 'Incompleto' || dia.status === 'Falta' ? 'row-warning' : ''}>
                  <td>
                    <div className="date-cell">
                      <strong>{new Date(dia.data).getUTCDate()}</strong>
                      <span>{new Date(dia.data).toLocaleDateString('pt-BR', {weekday:'short', timeZone:'UTC'})}</span>
                    </div>
                  </td>
                  <td>
                    <div className="colab-info">
                      <span className="colab-name">{dia.funcionarios?.nome_completo}</span>
                      <span className="colab-role">{dia.funcionarios?.cargo || 'Colaborador'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="jornada-tags">
                      {[dia.entrada_1, dia.saida_1, dia.entrada_2, dia.saida_2].map((h, i) => (
                        <span key={i} className={`time-tag ${!h ? 'empty' : ''}`}>{h ? h.substring(0,5) : '--:--'}</span>
                      ))}
                    </div>
                  </td>
                  <td className={dia.saldo_minutos < 0 ? 'text-red' : (dia.saldo_minutos > 0 ? 'text-green' : 'text-gray')}>
                    {dia.saldo_minutos > 0 ? '+' : ''}{dia.saldo_minutos} min
                  </td>
                  <td>
                    <span className={`status-badge status-${(dia.status||'Normal').split(' ')[0].toLowerCase()}`}>
                      {dia.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon-edit" onClick={() => setDiaEmEdicao(dia)}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. FOOTER FIXO */}
      <div className="sticky-footer">
        <div className="footer-info">
          <strong>Resumo do Mês:</strong> {kpis.total} registros | {kpis.erros} pendências para corrigir.
        </div>
        <button className="btn-process-month" onClick={handleFecharMes}>
          <span className="material-symbols-outlined">check_circle</span>
          Fechar Mês e Enviar para Folha
        </button>
      </div>

      {/* --- MODAIS --- */}

      {/* Modal de Configuração (Jornadas) */}
      {showConfig && (
        <div className="modal-overlay" onClick={() => setShowConfig(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Configuração de Jornadas</h3>
              <button onClick={() => setShowConfig(false)}>×</button>
            </div>
            <div className="modal-body">
               {/* Formulários de Jornada e Vínculo (Reutilizados da versão anterior, mas em modal) */}
               <div className="config-section">
                 <h4>Nova Jornada</h4>
                 <div className="form-row">
                   <input className="filter-input" placeholder="Nome da Escala" value={novaJornada.descricao} onChange={e=>setNovaJornada({...novaJornada, descricao:e.target.value})} />
                 </div>
                 <div className="form-row grid-4">
                   <input type="time" className="filter-input" value={novaJornada.entrada_1} onChange={e=>setNovaJornada({...novaJornada, entrada_1:e.target.value})} />
                   <input type="time" className="filter-input" value={novaJornada.saida_1} onChange={e=>setNovaJornada({...novaJornada, saida_1:e.target.value})} />
                   <input type="time" className="filter-input" value={novaJornada.entrada_2} onChange={e=>setNovaJornada({...novaJornada, entrada_2:e.target.value})} />
                   <input type="time" className="filter-input" value={novaJornada.saida_2} onChange={e=>setNovaJornada({...novaJornada, saida_2:e.target.value})} />
                 </div>
                 <button className="btn-primary w-full" onClick={handleCriarJornada}>Salvar Jornada</button>
               </div>
               
               <hr className="divider" />

               <div className="config-section">
                 <h4>Vincular Colaborador</h4>
                 <div className="form-row">
                   <select className="filter-input" onChange={e=>setVinculo({...vinculo, funcionarioId:e.target.value})}><option>Selecione Colaborador...</option>{funcionarios?.map(f=><option key={f.id} value={f.id}>{f.nome_completo}</option>)}</select>
                 </div>
                 <div className="form-row">
                   <select className="filter-input" onChange={e=>setVinculo({...vinculo, jornadaId:e.target.value})}><option>Selecione Jornada...</option>{jornadas?.map(j=><option key={j.id} value={j.id}>{j.descricao}</option>)}</select>
                 </div>
                 <button className="btn-primary w-full" onClick={handleVincular}>Salvar Vínculo</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Dia (Tratamento) */}
      {diaEmEdicao && (
        <div className="modal-overlay" onClick={() => setDiaEmEdicao(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '450px'}}>
            <div className="modal-header">
              <h3>Ajuste Manual</h3>
              <button onClick={() => setDiaEmEdicao(null)}>×</button>
            </div>
            <form onSubmit={handleSalvarEdicaoDia} className="modal-body">
              <div className="form-row grid-2">
                <div><label>Ent 1</label><input type="time" className="filter-input w-full" value={diaEmEdicao.entrada_1||''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, entrada_1:e.target.value})} /></div>
                <div><label>Sai 1</label><input type="time" className="filter-input w-full" value={diaEmEdicao.saida_1||''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, saida_1:e.target.value})} /></div>
                <div><label>Ent 2</label><input type="time" className="filter-input w-full" value={diaEmEdicao.entrada_2||''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, entrada_2:e.target.value})} /></div>
                <div><label>Sai 2</label><input type="time" className="filter-input w-full" value={diaEmEdicao.saida_2||''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, saida_2:e.target.value})} /></div>
              </div>
              <div className="form-row">
                <label>Status</label>
                <select className="filter-input w-full" value={diaEmEdicao.status} onChange={e=>setDiaEmEdicao({...diaEmEdicao, status:e.target.value})}>
                  <option value="Normal">Normal</option>
                  <option value="Falta">Falta</option>
                  <option value="Atestado">Atestado</option>
                  <option value="Folga">Folga</option>
                </select>
              </div>
              <div className="form-row">
                <label>Observação</label>
                <textarea className="filter-input w-full" rows="2" value={diaEmEdicao.observacao||''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, observacao:e.target.value})}></textarea>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setDiaEmEdicao(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}