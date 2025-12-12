import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
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
  const [activeTab, setActiveTab] = useState('tratamento');
  const [loading, setLoading] = useState(false);

  // Filtros
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7));
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Dados
  const [espelhoData, setEspelhoData] = useState([]);
  const [diaEmEdicao, setDiaEmEdicao] = useState(null);

  // Importação e Config
  const [file, setFile] = useState(null);
  const [batidasImportacao, setBatidasImportacao] = useState([]);
  const [stepImportacao, setStepImportacao] = useState(1);
  const [novaJornada, setNovaJornada] = useState({ descricao: '', entrada_1: '08:00', saida_1: '12:00', entrada_2: '13:00', saida_2: '17:00' });
  const [vinculo, setVinculo] = useState({ funcionarioId: '', jornadaId: '' });

  // Hooks
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);
  const { data: jornadas, mutate: mutateJornadas } = useSWR('getJornadas', getJornadas);

  // --- CARGA DE DADOS ---
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
    if (activeTab === 'tratamento') carregarEspelho();
  }, [activeTab, mesReferencia, selectedFuncionario]);

  // --- KPIS ---
  const kpis = useMemo(() => {
    if (!espelhoData.length) return { total: 0, erros: 0, extras: '00:00', atrasos: '00:00' };
    let countErros = 0, minExtras = 0, minAtrasos = 0;

    espelhoData.forEach(dia => {
      if (['Falta', 'Incompleto', 'Sem Jornada', 'Erro'].some(st => dia.status?.includes(st))) countErros++;
      if ((dia.saldo_minutos || 0) > 0) minExtras += dia.saldo_minutos;
      if ((dia.saldo_minutos || 0) < 0) minAtrasos += Math.abs(dia.saldo_minutos);
    });

    const formatMin = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
    return { total: espelhoData.length, erros: countErros, extras: formatMin(minExtras), atrasos: formatMin(minAtrasos) };
  }, [espelhoData]);

  // --- IMPORTAÇÃO ---
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    try {
      const dadosBrutos = await parseArquivoPonto(selectedFile);
      const dadosProcessados = dadosBrutos.map(b => {
        const func = funcionarios?.find(f => f.pis && f.pis.replace(/\D/g, '') === b.pis);
        return {
          ...b,
          funcionario_id: func?.id || null,
          nome: func?.nome_completo || 'Desconhecido',
          jornada_id: func?.jornada_id
        };
      });
      setBatidasImportacao(dadosProcessados);
      setStepImportacao(2);
      toast.success(`${dadosProcessados.length} batidas lidas!`);
    } catch (err) {
      toast.error("Erro ao ler arquivo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarImportacao = async () => {
    setLoading(true);
    try {
      const resumoMap = {};
      batidasImportacao.forEach(b => {
        if (!b.funcionario_id || !b.data_hora) return;
        const dataStr = b.data_hora.split('T')[0];
        const key = `${b.funcionario_id}_${dataStr}`;
        if (!resumoMap[key]) resumoMap[key] = { funcionario_id: b.funcionario_id, data: dataStr, batidas: [] };
        resumoMap[key].batidas.push(b);
      });

      const listaResumo = Object.values(resumoMap).map(item => {
        const func = funcionarios?.find(f => f.id === item.funcionario_id);
        const jornada = jornadas?.find(j => j.id === func?.jornada_id) || jornadas?.[0];

        // Usa a calculadora corrigida
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

      await salvarImportacaoPonto({
        nome_arquivo: file?.name || 'Importacao.txt',
        periodo_referencia: mesReferencia
      }, batidasImportacao, listaResumo);

      toast.success("Importação concluída!");
      setBatidasImportacao([]);
      setStepImportacao(1);
      setActiveTab('tratamento');
      setTimeout(() => carregarEspelho(), 1000); // Delay para o banco processar
    } catch (err) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- TRATAMENTO ---
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

      toast.success("Dia salvo!");
      setDiaEmEdicao(null);
      carregarEspelho();
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  const handleFecharMes = async () => {
    if (!selectedFuncionario) return toast.error("Selecione um colaborador.");
    if (!window.confirm("Confirmar fechamento e envio para Folha?")) return;
    try {
      await fecharMesPonto(selectedFuncionario, mesReferencia);
      toast.success("Mês fechado!");
    } catch (err) {
      toast.error("Erro: " + err.message);
    }
  };

  // --- CONFIGURAÇÃO ---
  const handleCriarJornada = async () => {
    try { await createJornada(novaJornada); mutateJornadas(); toast.success("Criada!"); } catch (e) { toast.error("Erro"); }
  };
  const handleVincular = async () => {
    try { await vincularJornada(vinculo.funcionarioId, vinculo.jornadaId); toast.success("Vinculado!"); } catch (e) { toast.error("Erro"); }
  };

  return (
    <div className="ponto-container">
      <div className="ponto-header">
        <div className="ponto-title"><h1>Gestão de Ponto</h1><p>Central de tratamento.</p></div>
        <div className="header-actions">
          <button className={`btn-upload-mini ${activeTab === 'tratamento' ? 'active' : ''}`} onClick={() => setActiveTab('tratamento')}>Tratamento</button>
          <button className={`btn-upload-mini ${activeTab === 'importacao' ? 'active' : ''}`} onClick={() => setActiveTab('importacao')}>Importar</button>
          <button className={`btn-upload-mini ${activeTab === 'jornadas' ? 'active' : ''}`} onClick={() => setActiveTab('jornadas')}>Configuração</button>
        </div>
      </div>

      {activeTab === 'tratamento' && (
        <div className="fade-in">
          <div className="ponto-filters">
            <div className="filter-group"><label>Competência</label><input type="month" className="filter-input" value={mesReferencia} onChange={e => setMesReferencia(e.target.value)} /></div>
            <div className="filter-group"><label>Colaborador</label><select className="filter-input" value={selectedFuncionario} onChange={e => setSelectedFuncionario(e.target.value)}><option value="">Todos</option>{funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}</select></div>
            <div className="filter-group" style={{ flex: 2 }}><label>Busca</label><input className="filter-input" placeholder="Nome..." value={buscaTexto} onChange={e => setBuscaTexto(e.target.value)} /></div>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card blue"><div className="kpi-content"><span className="kpi-label">Registros</span><span className="kpi-value">{kpis.total}</span></div></div>
            <div className="kpi-card yellow"><div className="kpi-content"><span className="kpi-label">Pendências</span><span className="kpi-value">{kpis.erros}</span></div></div>
            <div className="kpi-card green"><div className="kpi-content"><span className="kpi-label">Extras</span><span className="kpi-value">+{kpis.extras}</span></div></div>
            <div className="kpi-card red"><div className="kpi-content"><span className="kpi-label">Atrasos</span><span className="kpi-value">-{kpis.atrasos}</span></div></div>
          </div>

          <div className="ponto-table-wrapper">
            <table className="ponto-table">
              <thead><tr><th>Data</th><th>Colaborador</th><th>Marcações</th><th>Saldo</th><th>Status</th><th>Ações</th></tr></thead>
              <tbody>
                {espelhoData.filter(d => !buscaTexto || d.funcionarios?.nome_completo.toLowerCase().includes(buscaTexto.toLowerCase())).map(dia => (
                  <tr key={dia.id}>
                    <td>{new Date(dia.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td>{dia.funcionarios?.nome_completo}</td>
                    <td>
                      <div className="jornada-tags">
                        <span className="time-tag">{dia.entrada_1?.substring(0, 5) || '--'}</span>
                        <span className="time-tag">{dia.saida_1?.substring(0, 5) || '--'}</span>
                        <span className="time-tag">{dia.entrada_2?.substring(0, 5) || '--'}</span>
                        <span className="time-tag">{dia.saida_2?.substring(0, 5) || '--'}</span>
                      </div>
                    </td>
                    <td style={{ color: dia.saldo_minutos < 0 ? 'red' : 'green', fontWeight: 'bold' }}>{dia.saldo_minutos} min</td>
                    <td><span className={`status-badge status-${(dia.status || 'normal').toLowerCase().split(' ')[0]}`}>{dia.status}</span></td>
                    <td><button className="btn-icon-edit" onClick={() => setDiaEmEdicao(dia)}><span className="material-symbols-outlined">edit</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sticky-footer">
            <div className="footer-summary"><span>{kpis.total} Dias</span></div>
            <button className="btn-process-month" onClick={handleFecharMes}>Fechar Mês</button>
          </div>
        </div>
      )}

      {activeTab === 'importacao' && (
        <div className="fade-in">
          {stepImportacao === 1 ? (
            <div className="dropzone-area"><input type="file" onChange={handleFileChange} /><label className="upload-label">Upload TXT (AFD)</label></div>
          ) : (
            <div>
              <h3>{batidasImportacao.length} Batidas Lidas</h3>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button className="btn-secondary" onClick={() => { setBatidasImportacao([]); setStepImportacao(1) }}>Cancelar</button>
                <button className="btn-primary" onClick={handleConfirmarImportacao} disabled={loading}>Confirmar Importação</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aba de Jornadas (Mantida simplificada para brevidade) */}
      {activeTab === 'jornadas' && (
        <div className="fade-in">
          <div className="kpi-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <h3>Nova Jornada</h3>
            <input className="filter-input" placeholder="Nome" value={novaJornada.descricao} onChange={e => setNovaJornada({ ...novaJornada, descricao: e.target.value })} />
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <input type="time" value={novaJornada.entrada_1} onChange={e => setNovaJornada({ ...novaJornada, entrada_1: e.target.value })} />
              <input type="time" value={novaJornada.saida_1} onChange={e => setNovaJornada({ ...novaJornada, saida_1: e.target.value })} />
              <input type="time" value={novaJornada.entrada_2} onChange={e => setNovaJornada({ ...novaJornada, entrada_2: e.target.value })} />
              <input type="time" value={novaJornada.saida_2} onChange={e => setNovaJornada({ ...novaJornada, saida_2: e.target.value })} />
            </div>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={handleCriarJornada}>Salvar</button>
          </div>
          <div className="kpi-card" style={{ marginTop: 20, flexDirection: 'column', alignItems: 'flex-start' }}>
            <h3>Vincular</h3>
            <select className="filter-input" onChange={e => setVinculo({ ...vinculo, funcionarioId: e.target.value })}><option>Colaborador...</option>{funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}</select>
            <select className="filter-input" style={{ marginTop: 10 }} onChange={e => setVinculo({ ...vinculo, jornadaId: e.target.value })}><option>Jornada...</option>{jornadas?.map(j => <option key={j.id} value={j.id}>{j.descricao}</option>)}</select>
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={handleVincular}>Vincular</button>
          </div>
        </div>
      )}

      {diaEmEdicao && (
        <div className="modal-overlay" onClick={() => setDiaEmEdicao(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Editar Dia</h3>
            <form onSubmit={handleSalvarEdicaoDia}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input type="time" value={diaEmEdicao.entrada_1 || ''} onChange={e => setDiaEmEdicao({ ...diaEmEdicao, entrada_1: e.target.value })} />
                <input type="time" value={diaEmEdicao.saida_1 || ''} onChange={e => setDiaEmEdicao({ ...diaEmEdicao, saida_1: e.target.value })} />
                <input type="time" value={diaEmEdicao.entrada_2 || ''} onChange={e => setDiaEmEdicao({ ...diaEmEdicao, entrada_2: e.target.value })} />
                <input type="time" value={diaEmEdicao.saida_2 || ''} onChange={e => setDiaEmEdicao({ ...diaEmEdicao, saida_2: e.target.value })} />
              </div>
              <select className="filter-input" style={{ marginTop: 10 }} value={diaEmEdicao.status} onChange={e => setDiaEmEdicao({ ...diaEmEdicao, status: e.target.value })}>
                <option value="Normal">Normal</option><option value="Falta">Falta</option><option value="Atestado">Atestado</option>
              </select>
              <textarea style={{ width: '100%', marginTop: 10 }} placeholder="Obs" value={diaEmEdicao.observacao || ''} onChange={e => setDiaEmEdicao({ ...diaEmEdicao, observacao: e.target.value })}></textarea>
              <button type="submit" className="btn-primary" style={{ marginTop: 10 }}>Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}