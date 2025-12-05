import React, { useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import { simularReajusteMassa, aplicarReajusteMassa } from '../services/movimentacaoService';
import { toast } from 'react-hot-toast';
import ModalReajusteIndividual from '../components/Modal/ModalReajusteIndividual'; // [NOVO]
import './GestaoSalariosPage.css';

// Motor de Cálculo (Mantido)
const calcularCustos = (salarioBruto) => {
  const bruto = parseFloat(salarioBruto || 0);
  let inss = 0;
  if (bruto <= 1412.00) inss = bruto * 0.075;
  else if (bruto <= 2666.68) inss = (1412 * 0.075) + ((bruto - 1412) * 0.09);
  else if (bruto <= 4000.03) inss = 105.9 + 112.92 + ((bruto - 2666.68) * 0.12);
  else if (bruto <= 7786.02) inss = 105.9 + 112.92 + 160.00 + ((bruto - 4000.03) * 0.14);
  else inss = 908.85; 

  const baseIR = bruto - inss;
  let irrf = 0;
  if (baseIR > 2259.20) {
     if (baseIR <= 2826.65) irrf = (baseIR * 0.075) - 169.44;
     else if (baseIR <= 3751.05) irrf = (baseIR * 0.15) - 381.44;
     else if (baseIR <= 4664.68) irrf = (baseIR * 0.225) - 662.77;
     else irrf = (baseIR * 0.275) - 896.00;
  }
  if (irrf < 0) irrf = 0;

  const custoTotal = bruto + (bruto * 0.08) + (bruto * 0.288); // FGTS + Encargos

  return { bruto, inss, irrf, liquido: bruto - inss - irrf, custoTotal };
};

export default function GestaoSalariosPage() {
  const { data: funcionarios, isLoading } = useSWR('getFuncionarios', getFuncionarios);
  const { mutate } = useSWRConfig();
  
  // Estados
  const [modoReajuste, setModoReajuste] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false); // [NOVO] Modo Privacidade
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null); // Para o Modal
  
  const [paramsReajuste, setParamsReajuste] = useState({ tipo: 'Porcentagem', valor: 5, departamento: 'Todos' });
  const [simulacao, setSimulacao] = useState([]);
  const [loadingSimulacao, setLoadingSimulacao] = useState(false);

  const departamentos = useMemo(() => {
    if (!funcionarios) return [];
    const deptos = new Set(funcionarios.map(f => f.departamento).filter(Boolean));
    return ['Todos', ...Array.from(deptos)];
  }, [funcionarios]);

  const metricas = useMemo(() => {
    if (!funcionarios) return null;
    return funcionarios.reduce((acc, func) => {
      if (func.status !== 'Ativo') return acc;
      const calc = calcularCustos(func.salario_bruto);
      acc.totalBruto += calc.bruto;
      acc.totalLiquido += calc.liquido;
      acc.totalCusto += calc.custoTotal;
      acc.count++;
      return acc;
    }, { totalBruto: 0, totalLiquido: 0, totalCusto: 0, count: 0 });
  }, [funcionarios]);

  // Função para mascarar valores
  const maskValue = (val) => privacyMode ? '•••••' : val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  const handleSimular = async () => {
    if (!paramsReajuste.valor) return toast.error("Informe um valor.");
    setLoadingSimulacao(true);
    try {
      const resultado = await simularReajusteMassa({
        departamento: paramsReajuste.departamento,
        tipoReajuste: paramsReajuste.tipo,
        valor: parseFloat(paramsReajuste.valor),
        dataVigencia: new Date().toISOString()
      });
      setSimulacao(resultado);
      if (resultado.length > 0) toast.success(`${resultado.length} calculados.`);
      else toast('Nenhum resultado.', { icon: 'ℹ️' });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingSimulacao(false);
    }
  };

  const handleAplicarMassa = async () => {
    if (!window.confirm(`Aplicar reajuste para ${simulacao.length} pessoas?`)) return;
    setLoadingSimulacao(true);
    try {
      await aplicarReajusteMassa(simulacao, `Reajuste em Massa: ${paramsReajuste.tipo} ${paramsReajuste.valor}`, new Date());
      toast.success("Sucesso!");
      setModoReajuste(false);
      setSimulacao([]);
      mutate('getFuncionarios');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoadingSimulacao(false);
    }
  };

  return (
    <div className="gestao-salarios-container">
      <div className="header-salarios">
        <div>
          <h1>Gestão de Salários & Custos</h1>
          <p>Painel Financeiro de Pessoal (Confidencial)</p>
        </div>
        <div className="header-actions">
          {/* Botão de Privacidade */}
          <button 
            className={`btn-privacy ${privacyMode ? 'active' : ''}`}
            onClick={() => setPrivacyMode(!privacyMode)}
            title={privacyMode ? "Mostrar Valores" : "Ocultar Valores"}
          >
            <span className="material-symbols-outlined">
              {privacyMode ? 'visibility_off' : 'visibility'}
            </span>
          </button>

          <button 
            className={`btn-reajuste ${modoReajuste ? 'active' : ''}`} 
            onClick={() => setModoReajuste(!modoReajuste)}
          >
            <span className="material-symbols-outlined">calculate</span>
            {modoReajuste ? 'Fechar Simulador' : 'Simulação em Massa'}
          </button>
        </div>
      </div>

      {/* KPI CARDS (Mascarados se Privacy Ativo) */}
      <div className="kpi-grid">
        <div className="kpi-card dark">
          <span>Custo Total Empresa</span>
          <h3>R$ {metricas ? maskValue(metricas.totalCusto) : '...'}</h3>
          <small>Encargos + Salários</small>
        </div>
        <div className="kpi-card">
          <span>Folha Bruta</span>
          <h3>R$ {metricas ? maskValue(metricas.totalBruto) : '...'}</h3>
        </div>
        <div className="kpi-card success">
          <span>Líquido Colaborador</span>
          <h3>R$ {metricas ? maskValue(metricas.totalLiquido) : '...'}</h3>
        </div>
      </div>

      {/* SIMULADOR EM MASSA */}
      {modoReajuste && (
        <div className="simulacao-box fade-in">
          <h4>Simulador de Reajuste Coletivo</h4>
          <div className="simulacao-controls">
            <select onChange={(e) => setParamsReajuste({...paramsReajuste, departamento: e.target.value})}>
              {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select onChange={(e) => setParamsReajuste({...paramsReajuste, tipo: e.target.value})}>
              <option value="Porcentagem">% Porcentagem</option>
              <option value="Valor Fixo">R$ Valor Fixo</option>
            </select>
            <input 
              type="number" placeholder="Valor" 
              onChange={(e) => setParamsReajuste({...paramsReajuste, valor: e.target.value})}
            />
            <button className="btn-primary" onClick={handleSimular} disabled={loadingSimulacao}>Calcular</button>
          </div>
          {simulacao.length > 0 && (
            <div className="resultado-simulacao">
              <p>Impacto: <strong>+ R$ {maskValue(simulacao.reduce((acc, i) => acc + i.diferenca, 0))}</strong></p>
              <button className="btn-success" onClick={handleAplicarMassa}>Aplicar Tudo</button>
            </div>
          )}
        </div>
      )}

      {/* TABELA ANALÍTICA */}
      <div className="tabela-custos-wrapper">
        <table className="tabela-custos">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Salário Bruto</th>
              <th>Líquido (Est.)</th>
              <th>Custo Empresa</th>
              <th width="50">Ação</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios?.filter(f => f.status === 'Ativo').map(func => {
              const calc = calcularCustos(func.salario_bruto);
              const simulado = simulacao.find(s => s.id === func.id);

              return (
                <tr key={func.id} className={simulado ? 'row-simulated' : ''}>
                  <td>
                    <div className="user-info">
                      <strong>{func.nome_completo}</strong>
                      <small>{func.cargo}</small>
                    </div>
                  </td>
                  <td>
                    <span className="valor-bruto">R$ {maskValue(calc.bruto)}</span>
                    {simulado && <span className="diff-tag">➝ {maskValue(simulado.novo_salario)}</span>}
                  </td>
                  <td className="text-success">R$ {maskValue(calc.liquido)}</td>
                  <td className="text-muted">R$ {maskValue(calc.custoTotal)}</td>
                  <td>
                    <button 
                      className="btn-icon-edit" 
                      title="Reajuste Individual"
                      onClick={() => setFuncionarioSelecionado(func)}
                    >
                      <span className="material-symbols-outlined">edit_square</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL INDIVIDUAL */}
      <ModalReajusteIndividual 
        isOpen={!!funcionarioSelecionado}
        funcionario={funcionarioSelecionado}
        onClose={() => setFuncionarioSelecionado(null)}
        onSuccess={() => mutate('getFuncionarios')}
      />
    </div>
  );
}