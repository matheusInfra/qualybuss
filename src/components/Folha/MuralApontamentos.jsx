import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient'; // Necessário para a sincronização manual
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
  
  // Grid Unificado: Pode ser Apontamento (Vivo) ou Histórico (Congelado)
  const [dadosGrid, setDadosGrid] = useState([]);
  
  // Cache de benefícios para cálculo em tempo real
  const [beneficiosCache, setBeneficiosCache] = useState({});
  const [savingField, setSavingField] = useState(null); // Feedback visual
  
  // Controle de Data
  const hoje = new Date();
  // Se hoje for > dia 20, sugere o mês seguinte.
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getDate() >= 20 ? (hoje.getMonth() + 2 > 12 ? 1 : hoje.getMonth() + 2) : hoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // --- CARREGAMENTO DE DADOS ---
  const carregarDados = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setDadosGrid([]); 
    
    try {
      // 1. Busca a competência (Cabeçalho)
      const comp = await getCompetenciaAtual(mesSelecionado, anoSelecionado, empresaId);
      setCompetencia(comp);

      if (comp) {
        if (comp.status === 'Fechada') {
          // --- MODO LEITURA (HISTÓRICO) ---
          const historico = await getHistoricoCompetencia(comp.id);
          
          // Mapeia histórico para o grid visual
          const dadosFormatados = historico.map(h => ({
            id: h.id,
            funcionario: h.funcionario,
            // Recupera valores originais do JSON salvo
            horas_extras_50: h.memoria_calculo?.proventos?.he50_qtd || 0,
            horas_extras_100: h.memoria_calculo?.proventos?.he100_qtd || 0,
            valor_dsr: h.memoria_calculo?.proventos?.dsr || 0,
            bonus_comissao: h.memoria_calculo?.proventos?.bonus || 0,
            faltas_dias: h.memoria_calculo?.descontos?.faltas_qtd || 0,
            outros_descontos: h.memoria_calculo?.descontos?.outros || 0,
            // Flags de controle
            isHistorico: true,
            calculoPronto: h.memoria_calculo // O cálculo já vem pronto do JSON
          }));
          setDadosGrid(dadosFormatados);

        } else {
          // --- MODO EDIÇÃO (ABERTO) ---
          const dados = await getApontamentos(comp.id);
          setDadosGrid(dados);

          // Carrega benefícios para a calculadora rodar aqui no frontend
          const ids = dados.map(d => d.funcionario_id);
          if (ids.length > 0) {
            const bens = await getBeneficiosEmLote(ids);
            const map = {};
            bens.forEach(b => { 
              if(!map[b.funcionario_id]) map[b.funcionario_id]=[]; 
              map[b.funcionario_id].push(b); 
            });
            setBeneficiosCache(map);
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar folha.");
    } finally {
      setLoading(false);
    }
  }, [empresaId, mesSelecionado, anoSelecionado]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // --- AÇÕES DO GESTOR ---

  const handleAbrirMes = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa primeiro.");
    
    setLoading(true);
    try {
      // Busca TODOS os funcionários ativos para iniciar a folha
      const { data: funcs } = await getFuncionarios({ limit: 2000, status: 'Ativo', empresaId });
      
      if (!funcs || funcs.length === 0) {
        toast.error("Não há funcionários ativos cadastrados nesta empresa.");
        return;
      }

      await abrirCompetencia(mesSelecionado, anoSelecionado, empresaId, funcs);
      toast.success(`Competência ${mesSelecionado}/${anoSelecionado} iniciada!`);
      carregarDados();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao abrir mês.");
    } finally {
      setLoading(false);
    }
  };

  // Sincroniza funcionários novos na folha já aberta
  const handleSincronizar = async () => {
    if (!competencia || competencia.status === 'Fechada') return;
    
    setLoading(true);
    try {
      // 1. Busca todos ativos no cadastro
      const { data: todosAtivos } = await getFuncionarios({ limit: 2000, status: 'Ativo', empresaId });
      
      // 2. Quem já está no grid?
      const idsNoGrid = new Set(dadosGrid.map(d => d.funcionario_id));
      
      // 3. Filtra quem falta
      const faltantes = todosAtivos.filter(f => !idsNoGrid.has(f.id));
      
      if (faltantes.length === 0) {
        toast.success("A folha já está sincronizada.");
        return;
      }

      // 4. Insere apenas os faltantes
      const inserts = faltantes.map(func => ({
        competencia_id: competencia.id,
        funcionario_id: func.id,
        horas_extras_50: 0,
        horas_extras_100: 0,
        faltas_dias: 0
      }));

      const { error } = await supabase.from('folha_apontamentos').insert(inserts);
      if (error) throw error;

      toast.success(`${faltantes.length} novos colaboradores adicionados!`);
      carregarDados();
    } catch (e) {
      console.error(e);
      toast.error("Erro na sincronização.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampo = async (id, campo, valor) => {
    if (competencia?.status === 'Fechada') return;

    setSavingField({ id, field: campo });
    
    // Atualização Otimista (Visual instantâneo)
    setDadosGrid(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

    try {
      await salvarApontamento(id, { [campo]: valor });
    } catch (error) {
      toast.error("Erro ao salvar.");
    } finally {
      setSavingField(null);
    }
  };

  const handleFecharFolha = async () => {
    if (!window.confirm("ATENÇÃO: Fechar a folha irá CONGELAR todos os valores e gerar o histórico oficial.\n\nDeseja continuar?")) return;
    
    setLoading(true);
    try {
      // Processa o cálculo final de todos para o snapshot
      const dadosFinais = dadosGrid.map(item => {
        const func = item.funcionario;
        const bens = beneficiosCache[func.id] || [];
        const calculo = calcularFolhaCompleta(func, item, bens);
        
        // Salva metadados de quantidade para reconstruir a tela no futuro
        calculo.proventos.he50_qtd = item.horas_extras_50;
        calculo.proventos.he100_qtd = item.horas_extras_100;
        calculo.descontos.faltas_qtd = item.faltas_dias;
        calculo.descontos.outros = item.outros_descontos;
        
        return { funcionario: func, apontamento: item, calculo };
      });

      await fecharFolha(competencia.id, dadosFinais);
      toast.success("Folha fechada com sucesso!");
      carregarDados(); // Recarrega status 'Fechada'
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fechar folha.");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  // --- RENDERIZAÇÃO CONDICIONAL ---

  if (loading && !competencia) {
    return <div className="loading-wrapper"><div className="spinner-simple"></div><p>Carregando competência...</p></div>;
  }

  // Estado Vazio (Nenhuma folha encontrada)
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
          <span className="material-symbols-outlined icon-big">calendar_add_on</span>
          <h3>Nenhuma folha iniciada</h3>
          <p>Selecione o mês e clique para iniciar os apontamentos.</p>
          <button className="btn-start" onClick={handleAbrirMes} disabled={!empresaId}>
            {empresaId ? 'Iniciar Competência' : 'Selecione uma Empresa'}
          </button>
        </div>
      </div>
    );
  }

  const isFechada = competencia.status === 'Fechada';
  
  // Totalizadores em Tempo Real
  const totalLiq = dadosGrid.reduce((acc, item) => {
    const calc = item.isHistorico ? item.calculoPronto : calcularFolhaCompleta(item.funcionario, item, beneficiosCache[item.funcionario_id] || []);
    return acc + (calc.totais?.liquido || calc.salario_liquido_final || 0);
  }, 0);

  const totalCusto = dadosGrid.reduce((acc, item) => {
    const calc = item.isHistorico ? item.calculoPronto : calcularFolhaCompleta(item.funcionario, item, beneficiosCache[item.funcionario_id] || []);
    return acc + (calc.totais?.custoEmpresa || calc.custo_empresa_final || 0);
  }, 0);

  return (
    <div className="mural-container fade-in">
      <div className="mural-header">
        <div className="mural-info">
          <h2>Mural de Apontamentos</h2>
          <div className="meta-info">
            Ref: <strong>{mesSelecionado}/{anoSelecionado}</strong>
            <span className={`status-badge ${isFechada ? 'fechada' : 'aberta'}`}>
              {competencia.status}
            </span>
          </div>
        </div>
        <div className="header-controls">
          {!isFechada && (
            <>
              <button className="btn-sync" onClick={handleSincronizar} title="Buscar novos funcionários">
                <span className="material-symbols-outlined">sync_person</span> Sincronizar
              </button>
              <button className="btn-close-folha" onClick={handleFecharFolha} disabled={loading}>
                <span className="material-symbols-outlined">lock</span> Fechar Folha
              </button>
            </>
          )}
        </div>
      </div>

      <div className="table-scroll-wrapper">
        <table className="mural-table">
          <thead>
            <tr>
              <th className="sticky-col">Colaborador</th>
              <th>Salário Base</th>
              <th className="input-head">HE 50%</th>
              <th className="input-head">HE 100%</th>
              <th className="input-head">DSR (R$)</th>
              <th className="input-head">Bônus</th>
              <th className="input-head text-red-head">Faltas (d)</th>
              <th className="input-head text-red-head">Outros</th>
              <th>Bruto</th>
              <th>Líquido</th>
              <th>Custo</th>
            </tr>
          </thead>
          <tbody>
            {dadosGrid.map((item) => {
              const calc = item.isHistorico 
                ? item.calculoPronto 
                : calcularFolhaCompleta(item.funcionario, item, beneficiosCache[item.funcionario_id] || []);
              
              const bruto = item.isHistorico ? item.bruto_final : calc.totais.bruto;
              const liquido = item.isHistorico ? item.liquido_final : calc.totais.liquido;
              const custo = item.isHistorico ? item.custo_final : calc.totais.custoEmpresa;

              return (
                <tr key={item.id} className={isFechada ? 'readonly-row' : ''}>
                  <td className="sticky-col">
                    <strong>{item.funcionario.nome_completo}</strong>
                    <br/><small>{item.funcionario.cargo}</small>
                  </td>
                  <td>{fmt(calc.base?.salario || item.salario_base_snap)}</td>
                  
                  {/* Inputs */}
                  <td><input type="number" className={`input-cell ${savingField?.id===item.id && savingField?.field==='horas_extras_50' ? 'saving':''}`} disabled={isFechada} value={item.horas_extras_50} onChange={e => setDadosGrid(prev => prev.map(p => p.id === item.id ? { ...p, horas_extras_50: e.target.value } : p))} onBlur={e => handleUpdateCampo(item.id, 'horas_extras_50', e.target.value)} /></td>
                  <td><input type="number" className="input-cell" disabled={isFechada} value={item.horas_extras_100} onChange={e => setDadosGrid(prev => prev.map(p => p.id === item.id ? { ...p, horas_extras_100: e.target.value } : p))} onBlur={e => handleUpdateCampo(item.id, 'horas_extras_100', e.target.value)} /></td>
                  <td><input type="number" className="input-cell" disabled={isFechada} value={item.valor_dsr} placeholder="Auto" onChange={e => setDadosGrid(prev => prev.map(p => p.id === item.id ? { ...p, valor_dsr: e.target.value } : p))} onBlur={e => handleUpdateCampo(item.id, 'valor_dsr', e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-green" disabled={isFechada} value={item.bonus_comissao} onChange={e => setDadosGrid(prev => prev.map(p => p.id === item.id ? { ...p, bonus_comissao: e.target.value } : p))} onBlur={e => handleUpdateCampo(item.id, 'bonus_comissao', e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-red" disabled={isFechada} value={item.faltas_dias} onChange={e => setDadosGrid(prev => prev.map(p => p.id === item.id ? { ...p, faltas_dias: e.target.value } : p))} onBlur={e => handleUpdateCampo(item.id, 'faltas_dias', e.target.value)} /></td>
                  <td><input type="number" className="input-cell text-red" disabled={isFechada} value={item.outros_descontos} onChange={e => setDadosGrid(prev => prev.map(p => p.id === item.id ? { ...p, outros_descontos: e.target.value } : p))} onBlur={e => handleUpdateCampo(item.id, 'outros_descontos', e.target.value)} /></td>

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
        <div className="total-block">
          <span>Total Líquido Previsto</span>
          <strong className="text-green">{fmt(totalLiq)}</strong>
        </div>
        <div className="total-block">
          <span>Custo Total Empresa</span>
          <strong className="text-blue">{fmt(totalCusto)}</strong>
        </div>
      </div>
    </div>
  );
}