import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import { 
  getCompetenciaAtual, 
  abrirCompetencia, 
  getApontamentos, 
  salvarApontamento, 
  fecharFolha, 
  getHistoricoCompetencia 
} from '../../services/folhaService';
import { getFuncionarios } from '../../services/funcionarioService';
import { getBeneficiosEmLote } from '../../services/beneficioService';
import { calcularFolhaCompleta } from '../../utils/calculadoraSalario';
import './MuralApontamentos.css';

export default function MuralApontamentos({ empresaId }) {
  const [loading, setLoading] = useState(false);
  const [competencia, setCompetencia] = useState(null);
  const [dadosGrid, setDadosGrid] = useState([]);
  const [beneficiosCache, setBeneficiosCache] = useState({});
  const [savingField, setSavingField] = useState(null);
  
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getDate() >= 20 ? (hoje.getMonth() + 2 > 12 ? 1 : hoje.getMonth() + 2) : hoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  const carregarDados = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setDadosGrid([]);
    
    try {
      const comp = await getCompetenciaAtual(mesSelecionado, anoSelecionado, empresaId);
      setCompetencia(comp);

      if (comp) {
        if (comp.status === 'Fechada') {
          // Histórico
          const historico = await getHistoricoCompetencia(comp.id);
          const formatados = historico.map(h => ({
            id: h.id,
            funcionario: h.funcionario,
            // Recupera do JSON salvo
            horas_extras_50: h.memoria_calculo?.proventos?.he50_qtd || 0,
            horas_extras_100: h.memoria_calculo?.proventos?.he100_qtd || 0,
            faltas_dias: h.memoria_calculo?.descontos?.faltas_qtd || 0,
            bonus_comissao: h.memoria_calculo?.proventos?.bonus || 0,
            valor_dsr: h.memoria_calculo?.proventos?.dsr || 0,
            outros_descontos: h.memoria_calculo?.descontos?.outros || 0,
            isHistorico: true,
            calculoPronto: h.memoria_calculo
          }));
          setDadosGrid(formatados);
        } else {
          // Edição
          const dados = await getApontamentos(comp.id);
          setDadosGrid(dados);
          
          const ids = dados.map(d => d.funcionario_id);
          if (ids.length > 0) {
            const bens = await getBeneficiosEmLote(ids);
            const map = {};
            bens.forEach(b => { if(!map[b.funcionario_id]) map[b.funcionario_id]=[]; map[b.funcionario_id].push(b); });
            setBeneficiosCache(map);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar folha.");
    } finally {
      setLoading(false);
    }
  }, [empresaId, mesSelecionado, anoSelecionado]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleAbrirMes = async () => {
    if (!empresaId) return toast.error("Selecione a empresa.");
    setLoading(true);
    try {
      const { data: funcs } = await getFuncionarios({ limit: 2000, status: 'Ativo', empresaId });
      if (!funcs || funcs.length === 0) { toast.error("Sem funcionários ativos."); return; }
      await abrirCompetencia(mesSelecionado, anoSelecionado, empresaId, funcs);
      toast.success("Competência aberta!");
      carregarDados();
    } catch { toast.error("Erro ao abrir."); } 
    finally { setLoading(false); }
  };

  const handleSincronizar = async () => {
    if (!competencia || competencia.status === 'Fechada') return;
    setLoading(true);
    try {
      const { data: todosAtivos } = await getFuncionarios({ limit: 2000, status: 'Ativo', empresaId });
      const idsNoGrid = new Set(dadosGrid.map(d => d.funcionario_id));
      const faltantes = todosAtivos.filter(f => !idsNoGrid.has(f.id));
      
      if (faltantes.length === 0) {
        toast.success("Já sincronizado.");
        return;
      }

      const inserts = faltantes.map(func => ({
        competencia_id: competencia.id,
        funcionario_id: func.id,
        horas_extras_50: 0,
        horas_extras_100: 0,
        faltas_dias: 0
      }));

      await supabase.from('folha_apontamentos').insert(inserts);
      toast.success(`${faltantes.length} adicionados!`);
      carregarDados();
    } catch (e) {
      toast.error("Erro na sincronização.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampo = async (id, campo, valor) => {
    if (competencia?.status === 'Fechada') return;
    setSavingField({ id, field: campo });
    setDadosGrid(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
    try { await salvarApontamento(id, { [campo]: valor }); } 
    catch { toast.error("Erro ao salvar."); } 
    finally { setSavingField(null); }
  };

  const handleFecharFolha = async () => {
    if (!window.confirm("ATENÇÃO: Fechar a folha irá CONGELAR os valores.\nConfirmar?")) return;
    setLoading(true);
    try {
      const dadosFinais = dadosGrid.map(item => {
        const func = item.funcionario;
        const bens = beneficiosCache[func.id] || [];
        const calculo = calcularFolhaCompleta(func, item, bens);
        
        calculo.proventos.he50_qtd = item.horas_extras_50;
        calculo.proventos.he100_qtd = item.horas_extras_100;
        calculo.descontos.faltas_qtd = item.faltas_dias;
        calculo.descontos.outros = item.outros_descontos;

        return { funcionario: func, apontamento: item, calculo };
      });
      
      await fecharFolha(competencia.id, dadosFinais);
      toast.success("Folha Fechada!");
      carregarDados();
    } catch { toast.error("Erro no fechamento."); } 
    finally { setLoading(false); }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  if (loading && !competencia) return <div className="loading-wrapper"><div className="spinner-simple"></div><p>Carregando...</p></div>;

  if (!competencia) {
    return (
      <div className="mural-container empty-state-mural">
        <div className="selector-bar">
          <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Mês {m}</option>)}
          </select>
          <select value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))}><option value={2024}>2024</option><option value={2025}>2025</option></select>
        </div>
        <div className="start-box">
          <span className="material-symbols-outlined icon-big">calendar_add_on</span>
          <h3>Nenhuma folha iniciada</h3>
          <button className="btn-start" onClick={handleAbrirMes} disabled={!empresaId}>
            {empresaId ? 'Iniciar Competência' : 'Selecione uma Empresa'}
          </button>
        </div>
      </div>
    );
  }

  const isFechada = competencia.status === 'Fechada';
  const totalLiq = dadosGrid.reduce((acc, item) => {
    const calc = item.isHistorico ? item.calculoPronto : calcularFolhaCompleta(item.funcionario, item, beneficiosCache[item.funcionario_id] || []);
    return acc + (calc.totais?.liquido || calc.salario_liquido_final || 0);
  }, 0);

  return (
    <div className="mural-container fade-in">
      <div className="mural-header">
        <div className="mural-info">
          <h2>Mural de Apontamentos</h2>
          <span>Ref: <strong>{mesSelecionado}/{anoSelecionado}</strong> <span className={`status-badge ${isFechada?'fechada':'aberta'}`}>{competencia.status}</span></span>
        </div>
        <div className="header-controls">
          {!isFechada && (
            <>
              <button className="btn-sync" onClick={handleSincronizar} title="Buscar novos"><span className="material-symbols-outlined">sync_person</span> Sincronizar</button>
              <button className="btn-close-folha" onClick={handleFecharFolha} disabled={loading}><span className="material-symbols-outlined">lock</span> Fechar Folha</button>
            </>
          )}
        </div>
      </div>

      <div className="table-scroll-wrapper">
        <table className="mural-table">
          <thead>
            <tr>
              <th className="sticky-col">Colaborador</th>
              <th>Base</th>
              <th>HE 50%</th><th>HE 100%</th><th>DSR</th><th>Bônus</th><th className="text-red-head">Faltas</th><th className="text-red-head">Outros</th>
              <th>Bruto</th><th>Líquido</th><th>Custo</th>
            </tr>
          </thead>
          <tbody>
            {dadosGrid.map((item) => {
              const calc = item.isHistorico ? item.calculoPronto : calcularFolhaCompleta(item.funcionario, item, beneficiosCache[item.funcionario_id] || []);
              
              const bruto = item.isHistorico ? item.bruto_final : calc.totais.bruto;
              const liquido = item.isHistorico ? item.liquido_final : calc.totais.liquido;
              const custo = item.isHistorico ? item.custo_final : calc.totais.custoEmpresa;

              return (
                <tr key={item.id} className={isFechada ? 'readonly-row' : ''}>
                  <td className="sticky-col"><strong>{item.funcionario.nome_completo}</strong></td>
                  <td>{fmt(calc.base?.salario || item.salario_base_snap)}</td>
                  
                  <td><input type="number" className={`input-cell ${savingField?.id===item.id && savingField?.field==='horas_extras_50' ? 'saving':''}`} disabled={isFechada} value={item.horas_extras_50} onChange={e=>setDadosGrid(p=>p.map(x=>x.id===item.id?{...x,horas_extras_50:e.target.value}:x))} onBlur={e=>handleUpdateCampo(item.id,'horas_extras_50',e.target.value)} /></td>
                  <td><input type="number" className="input-cell" disabled={isFechada} value={item.horas_extras_100} onChange={e=>setDadosGrid(p=>p.map(x=>x.id===item.id?{...x,horas_extras_100:e.target.value}:x))} onBlur={e=>handleUpdateCampo(item.id,'horas_extras_100',e.target.value)} /></td>
                  <td><input type="number" className="input-cell" disabled={isFechada} value={item.valor_dsr} placeholder="Auto" onChange={e=>setDadosGrid(p=>p.map(x=>x.id===item.id?{...x,valor_dsr:e.target.value}:x))} onBlur={e=>handleUpdateCampo(item.id,'valor_dsr',e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-green" disabled={isFechada} value={item.bonus_comissao} onChange={e=>setDadosGrid(p=>p.map(x=>x.id===item.id?{...x,bonus_comissao:e.target.value}:x))} onBlur={e=>handleUpdateCampo(item.id,'bonus_comissao',e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-red" disabled={isFechada} value={item.faltas_dias} onChange={e=>setDadosGrid(p=>p.map(x=>x.id===item.id?{...x,faltas_dias:e.target.value}:x))} onBlur={e=>handleUpdateCampo(item.id,'faltas_dias',e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-red" disabled={isFechada} value={item.outros_descontos} onChange={e=>setDadosGrid(p=>p.map(x=>x.id===item.id?{...x,outros_descontos:e.target.value}:x))} onBlur={e=>handleUpdateCampo(item.id,'outros_descontos',e.target.value)} /></td>

                  <td className="font-bold">{fmt(bruto)}</td>
                  <td className="bg-green-light font-bold text-green">{fmt(liquido)}</td>
                  <td className="text-blue font-bold">{fmt(custo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mural-footer">
        <span>Total Líquido: <strong className="text-green">{fmt(totalLiq)}</strong></span>
      </div>
    </div>
  );
}