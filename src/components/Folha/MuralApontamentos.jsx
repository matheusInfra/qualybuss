import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getCompetenciaAtual, abrirCompetencia, getApontamentos, salvarApontamento, fecharFolha } from '../../services/folhaService';
import { getFuncionarios } from '../../services/funcionarioService';
import { getBeneficiosEmLote } from '../../services/beneficioService';
import { calcularFolhaCompleta } from '../../utils/calculadoraSalario';
import './MuralApontamentos.css';

export default function MuralApontamentos({ empresaId }) {
  const [loading, setLoading] = useState(false);
  const [competencia, setCompetencia] = useState(null);
  const [apontamentos, setApontamentos] = useState([]);
  const [beneficiosCache, setBeneficiosCache] = useState({});
  const [savingField, setSavingField] = useState(null); // {id, field}
  
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  const carregarDados = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const comp = await getCompetenciaAtual(mesSelecionado, anoSelecionado, empresaId);
      setCompetencia(comp);
      if (comp) {
        const dados = await getApontamentos(comp.id);
        setApontamentos(dados);
        
        // Carrega benefícios para cálculo em tempo real
        const ids = dados.map(d => d.funcionario_id);
        if (ids.length > 0) {
          const bens = await getBeneficiosEmLote(ids);
          const map = {};
          bens.forEach(b => { 
            if(!map[b.funcionario_id]) map[b.funcionario_id]=[]; 
            map[b.funcionario_id].push(b); 
          });
          setBeneficiosCache(map);
        } else {
          setBeneficiosCache({});
        }
      } else {
        setApontamentos([]);
        setBeneficiosCache({});
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
    try {
      setLoading(true);
      const { data: funcs } = await getFuncionarios({ limit: 1000, status: 'Ativo', empresaId });
      if (!funcs?.length) { toast.error("Sem funcionários ativos."); return; }
      await abrirCompetencia(mesSelecionado, anoSelecionado, empresaId, funcs);
      toast.success("Competência Aberta!");
      carregarDados();
    } catch { toast.error("Erro ao abrir."); } 
    finally { setLoading(false); }
  };

  const handleUpdateCampo = async (id, campo, valor) => {
    setSavingField({ id, field: campo });
    // Atualização otimista na tela
    setApontamentos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
    try { await salvarApontamento(id, { [campo]: valor }); } 
    catch { toast.error("Erro ao salvar."); } 
    finally { setSavingField(null); }
  };

  const handleFecharFolha = async () => {
    if (!window.confirm("Confirma o fechamento da folha? Os valores serão congelados.")) return;
    setLoading(true);
    try {
      const dadosFinais = apontamentos.map(apont => {
        const func = apont.funcionario;
        const bens = beneficiosCache[func.id] || [];
        const calculo = calcularFolhaCompleta(func, apont, bens);
        return { funcionario: func, apontamento: apont, calculo };
      });
      await fecharFolha(competencia.id, dadosFinais);
      toast.success("Folha Fechada com Sucesso!");
      carregarDados();
    } catch { toast.error("Erro no fechamento."); } 
    finally { setLoading(false); }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  // --- CORREÇÃO DO FLUXO DE RENDERIZAÇÃO ---

  // 1. Se estiver carregando, mostra spinner
  if (loading) {
    return (
      <div className="mural-container loading-wrapper">
        <div className="spinner-simple"></div>
        <p>Carregando competência...</p>
      </div>
    );
  }

  // 2. Se não tem competência (e não está carregando), mostra Empty State
  if (!competencia) {
    return (
      <div className="mural-container empty-state-mural">
        <div className="selector-bar">
          <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))}>
            {Array.from({length:12},(_,i)=>i+1).map(m => <option key={m} value={m}>Mês {m}</option>)}
          </select>
          <select value={anoSelecionado} onChange={e => setAnoSelecionado(Number(e.target.value))}>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
        <div className="start-box">
          <span className="material-symbols-outlined icon-big">calendar_month</span>
          <h3>Nenhuma folha para este período</h3>
          <button className="btn-start" onClick={handleAbrirMes}>Iniciar Competência</button>
        </div>
      </div>
    );
  }

  // 3. Se chegou aqui, competência existe e não é null. Seguro para renderizar.
  const isFechada = competencia.status === 'Fechada';
  const totalLiq = apontamentos.reduce((acc, c) => acc + calcularFolhaCompleta(c.funcionario, c, beneficiosCache[c.funcionario_id]||[]).totais.liquido, 0);
  const totalCusto = apontamentos.reduce((acc, c) => acc + calcularFolhaCompleta(c.funcionario, c, beneficiosCache[c.funcionario_id]||[]).totais.custoEmpresa, 0);

  return (
    <div className="mural-container fade-in">
      <div className="mural-header">
        <div className="mural-info">
          <h2>Mural de Apontamentos</h2>
          <span>Competência: <strong>{mesSelecionado}/{anoSelecionado}</strong> <span className={`status-badge ${isFechada?'fechada':'aberta'}`}>{competencia.status}</span></span>
        </div>
        {!isFechada && <button className="btn-close-folha" onClick={handleFecharFolha} disabled={loading}>Fechar Folha</button>}
      </div>

      <div className="table-scroll-wrapper">
        <table className="mural-table">
          <thead>
            <tr>
              <th className="sticky-col">Colaborador</th>
              <th>Base</th>
              <th className="input-head">HE 50%</th><th className="input-head">HE 100%</th><th className="input-head">DSR (R$)</th><th className="input-head">Bônus</th><th className="input-head text-red">Faltas (d)</th>
              <th>Bruto</th><th>Líquido</th><th>Custo</th>
            </tr>
          </thead>
          <tbody>
            {apontamentos.map((apont) => {
              const calc = calcularFolhaCompleta(apont.funcionario, apont, beneficiosCache[apont.funcionario_id] || []);
              return (
                <tr key={apont.id} className={isFechada ? 'readonly' : ''}>
                  <td className="sticky-col"><strong>{apont.funcionario.nome_completo}</strong><br/><small>{apont.funcionario.cargo}</small></td>
                  <td>{fmt(calc.base.salario)}</td>
                  <td><input type="number" className={`input-cell ${savingField?.id===apont.id && savingField?.field==='horas_extras_50' ? 'saving':''}`} disabled={isFechada} value={apont.horas_extras_50} onChange={e=>setApontamentos(p=>p.map(x=>x.id===apont.id?{...x,horas_extras_50:e.target.value}:x))} onBlur={e=>handleUpdateCampo(apont.id,'horas_extras_50',e.target.value)} /></td>
                  <td><input type="number" className="input-cell" disabled={isFechada} value={apont.horas_extras_100} onChange={e=>setApontamentos(p=>p.map(x=>x.id===apont.id?{...x,horas_extras_100:e.target.value}:x))} onBlur={e=>handleUpdateCampo(apont.id,'horas_extras_100',e.target.value)} /></td>
                  <td><input type="number" className="input-cell" disabled={isFechada} value={apont.valor_dsr} onChange={e=>setApontamentos(p=>p.map(x=>x.id===apont.id?{...x,valor_dsr:e.target.value}:x))} onBlur={e=>handleUpdateCampo(apont.id,'valor_dsr',e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-green" disabled={isFechada} value={apont.bonus_comissao} onChange={e=>setApontamentos(p=>p.map(x=>x.id===apont.id?{...x,bonus_comissao:e.target.value}:x))} onBlur={e=>handleUpdateCampo(apont.id,'bonus_comissao',e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-red" disabled={isFechada} value={apont.faltas_dias} onChange={e=>setApontamentos(p=>p.map(x=>x.id===apont.id?{...x,faltas_dias:e.target.value}:x))} onBlur={e=>handleUpdateCampo(apont.id,'faltas_dias',e.target.value)} /></td>
                  <td>{fmt(calc.totais.bruto)}</td>
                  <td className="bg-green-light font-bold text-green">{fmt(calc.totais.liquido)}</td>
                  <td className="text-blue font-bold">{fmt(calc.totais.custoEmpresa)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mural-footer">
        <div><span>Total Líquido Previsto:</span> <strong className="text-green">{fmt(totalLiq)}</strong></div>
        <div style={{marginLeft:'20px'}}><span>Custo Empresa:</span> <strong className="text-blue">{fmt(totalCusto)}</strong></div>
      </div>
    </div>
  );
}