import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { getCompetenciaAtual, abrirCompetencia, getApontamentos, salvarApontamento, fecharFolha } from '../../services/folhaService';
import { getFuncionarios } from '../../services/funcionarioService';
import { getBeneficiosEmLote } from '../../services/beneficioService';
import { calcularFolhaCompleta } from '../../utils/calculadoraSalario';
import './MuralApontamentos.css';

export default function MuralApontamentos({ empresaId }) {
  const [loading, setLoading] = useState(false);
  const [competencia, setCompetencia] = useState(null); // Dados do Mês
  const [apontamentos, setApontamentos] = useState([]); // Lista de Colaboradores + Variáveis
  const [beneficiosCache, setBeneficiosCache] = useState({}); // Cache para cálculo
  
  // Seletores de Data
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  // --- CARREGAMENTO ---
  const carregarDados = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // 1. Busca a competência no banco
      const comp = await getCompetenciaAtual(mesSelecionado, anoSelecionado, empresaId);
      setCompetencia(comp);

      if (comp) {
        // 2. Se existe, busca os apontamentos já criados
        const dados = await getApontamentos(comp.id);
        setApontamentos(dados);
        
        // 3. Carrega benefícios para o cálculo em tempo real
        const ids = dados.map(d => d.funcionario_id);
        const bens = await getBeneficiosEmLote(ids);
        const map = {};
        bens.forEach(b => {
          if (!map[b.funcionario_id]) map[b.funcionario_id] = [];
          map[b.funcionario_id].push(b);
        });
        setBeneficiosCache(map);
      } else {
        setApontamentos([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar competência.");
    } finally {
      setLoading(false);
    }
  }, [empresaId, mesSelecionado, anoSelecionado]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // --- AÇÕES ---

  const handleAbrirMes = async () => {
    try {
      setLoading(true);
      // Busca todos os ativos para iniciar a folha
      const { data: funcs } = await getFuncionarios({ limit: 1000, status: 'Ativo', empresaId });
      
      if (!funcs || funcs.length === 0) {
        toast.error("Não há funcionários ativos para abrir folha.");
        return;
      }

      await abrirCompetencia(mesSelecionado, anoSelecionado, empresaId, funcs);
      toast.success(`Competência ${mesSelecionado}/${anoSelecionado} aberta!`);
      carregarDados();
    } catch (error) {
      toast.error("Erro ao abrir mês.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCampo = async (id, campo, valor) => {
    // Atualização Otimista na UI
    const novosApontamentos = apontamentos.map(item => 
      item.id === id ? { ...item, [campo]: valor } : item
    );
    setApontamentos(novosApontamentos);

    // Salva no banco (debounce idealmente, aqui direto no onBlur)
    try {
      await salvarApontamento(id, { [campo]: valor });
    } catch (error) {
      toast.error("Erro ao salvar alteração.");
    }
  };

  const handleProcessarPrevia = () => {
    // Apenas recalcula visualmente os totais baseados nos inputs atuais
    toast.success("Cálculos atualizados na tela.");
    // O render já chama a calculadora, forçamos apenas um refresh visual se necessário
    setApontamentos([...apontamentos]); 
  };

  const handleFecharFolha = async () => {
    if (!window.confirm("ATENÇÃO: Fechar a folha irá congelar todos os valores e gerar o histórico oficial. Continuar?")) return;
    
    setLoading(true);
    try {
      // 1. Processa todos os cálculos finais
      const dadosFinais = apontamentos.map(apont => {
        const func = apont.funcionario;
        const bens = beneficiosCache[func.id] || [];
        const calculo = calcularFolhaCompleta(func, apont, bens);
        return { funcionario: func, apontamento: apont, calculo };
      });

      // 2. Envia para o backend congelar
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

  // --- RENDERIZADORES ---
  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const renderStatusBadge = () => {
    if (!competencia) return <span className="badge-status inativo">Não Iniciada</span>;
    return <span className={`badge-status ${competencia.status.toLowerCase()}`}>{competencia.status}</span>;
  };

  // Se não tiver competência, mostra tela de abertura
  if (!competencia && !loading) {
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
          <h3>Nenhuma folha encontrada para este período</h3>
          <p>Deseja iniciar o apontamento de horas e variáveis?</p>
          <button className="btn-start" onClick={handleAbrirMes}>Iniciar Competência</button>
        </div>
      </div>
    );
  }

  const isFechada = competencia?.status === 'Fechada';

  return (
    <div className="mural-container fade-in">
      {/* Header de Controle */}
      <div className="mural-header">
        <div className="mural-info">
          <h2>Mural de Apontamentos</h2>
          <div className="meta-info">
            Ref: <strong>{mesSelecionado}/{anoSelecionado}</strong>
            {renderStatusBadge()}
          </div>
        </div>
        <div className="mural-actions">
          {!isFechada && (
            <>
              <button className="btn-secondary" onClick={handleProcessarPrevia} disabled={loading}>
                <span className="material-symbols-outlined">calculate</span> Recalcular Prévia
              </button>
              <button className="btn-primary" onClick={handleFecharFolha} disabled={loading}>
                <span className="material-symbols-outlined">lock</span> Fechar Folha
              </button>
            </>
          )}
          {isFechada && (
            <button className="btn-success" disabled>
              <span className="material-symbols-outlined">check_circle</span> Processado
            </button>
          )}
        </div>
      </div>

      {/* Tabela Excel-Like */}
      <div className="table-scroll-wrapper">
        <table className="mural-table">
          <thead>
            <tr>
              <th className="sticky-col">Colaborador</th>
              <th>Salário Base</th>
              <th className="input-col">HE 50% (h)</th>
              <th className="input-col">HE 100% (h)</th>
              <th className="input-col">DSR (R$)</th>
              <th className="input-col">Bônus (R$)</th>
              <th className="input-col text-red">Faltas (d)</th>
              <th className="input-col text-red">Atrasos (min)</th>
              <th>Bruto Calc.</th>
              <th>Líquido Est.</th>
              <th>Custo Empresa</th>
            </tr>
          </thead>
          <tbody>
            {apontamentos.map((apont) => {
              // Calcula em tempo real para mostrar prévia (não salva no banco o cálculo, só inputs)
              const calculoPreview = calcularFolhaCompleta(
                apont.funcionario, 
                apont, 
                beneficiosCache[apont.funcionario_id] || []
              );

              return (
                <tr key={apont.id} className={isFechada ? 'readonly-row' : ''}>
                  <td className="sticky-col">
                    <div className="user-mini">
                      <strong>{apont.funcionario.nome_completo}</strong>
                      <small>{apont.funcionario.cargo}</small>
                    </div>
                  </td>
                  <td>{formatMoney(calculoPreview.base.salario)}</td>
                  
                  {/* Inputs de Variáveis */}
                  <td>
                    <input 
                      type="number" className="input-cell" 
                      disabled={isFechada}
                      value={apont.horas_extras_50}
                      onBlur={(e) => handleUpdateCampo(apont.id, 'horas_extras_50', e.target.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApontamentos(prev => prev.map(p => p.id === apont.id ? {...p, horas_extras_50: val} : p));
                      }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" className="input-cell"
                      disabled={isFechada}
                      value={apont.horas_extras_100}
                      onBlur={(e) => handleUpdateCampo(apont.id, 'horas_extras_100', e.target.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApontamentos(prev => prev.map(p => p.id === apont.id ? {...p, horas_extras_100: val} : p));
                      }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" className="input-cell" placeholder="Auto"
                      disabled={isFechada}
                      value={apont.valor_dsr}
                      onBlur={(e) => handleUpdateCampo(apont.id, 'valor_dsr', e.target.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApontamentos(prev => prev.map(p => p.id === apont.id ? {...p, valor_dsr: val} : p));
                      }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" className="input-cell text-green"
                      disabled={isFechada}
                      value={apont.bonus_comissao}
                      onBlur={(e) => handleUpdateCampo(apont.id, 'bonus_comissao', e.target.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApontamentos(prev => prev.map(p => p.id === apont.id ? {...p, bonus_comissao: val} : p));
                      }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" className="input-cell text-red"
                      disabled={isFechada}
                      value={apont.faltas_dias}
                      onBlur={(e) => handleUpdateCampo(apont.id, 'faltas_dias', e.target.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApontamentos(prev => prev.map(p => p.id === apont.id ? {...p, faltas_dias: val} : p));
                      }}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" className="input-cell text-red"
                      disabled={isFechada}
                      value={apont.atrasos_minutos}
                      onBlur={(e) => handleUpdateCampo(apont.id, 'atrasos_minutos', e.target.value)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setApontamentos(prev => prev.map(p => p.id === apont.id ? {...p, atrasos_minutos: val} : p));
                      }}
                    />
                  </td>

                  {/* Resultados Calculados (Prévia) */}
                  <td className="font-bold">{formatMoney(calculoPreview.totais.bruto)}</td>
                  <td className="text-green font-bold bg-green-light">{formatMoney(calculoPreview.totais.liquido)}</td>
                  <td className="text-blue font-bold">{formatMoney(calculoPreview.totais.custoEmpresa)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Footer com Totais da Competência */}
      <div className="mural-footer">
        <div>
          <span>Total Líquido Previsto:</span>
          <strong>{formatMoney(apontamentos.reduce((acc, curr) => {
             const bens = beneficiosCache[curr.funcionario_id] || [];
             return acc + calcularFolhaCompleta(curr.funcionario, curr, bens).totais.liquido;
          }, 0))}</strong>
        </div>
        <div>
          <span>Custo Total Empresa:</span>
          <strong className="text-blue">{formatMoney(apontamentos.reduce((acc, curr) => {
             const bens = beneficiosCache[curr.funcionario_id] || [];
             return acc + calcularFolhaCompleta(curr.funcionario, curr, bens).totais.custoEmpresa;
          }, 0))}</strong>
        </div>
      </div>
    </div>
  );
}