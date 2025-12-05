import React, { useState, useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import { simularReajusteMassa, aplicarReajusteMassa } from '../services/movimentacaoService';
import { toast } from 'react-hot-toast';
import './GestaoSalariosPage.css'; // Criar CSS depois

// --- MOTOR DE CÁLCULO DE IMPOSTOS (SIMPLIFICADO 2024/2025) ---
const calcularCustos = (salarioBruto) => {
  const bruto = parseFloat(salarioBruto || 0);
  
  // 1. INSS (Progressivo 2024 - Valores aproximados para MVP)
  let inss = 0;
  if (bruto <= 1412.00) inss = bruto * 0.075;
  else if (bruto <= 2666.68) inss = (1412 * 0.075) + ((bruto - 1412) * 0.09);
  else if (bruto <= 4000.03) inss = (1412 * 0.075) + ((2666.68 - 1412) * 0.09) + ((bruto - 2666.68) * 0.12);
  else if (bruto <= 7786.02) inss = (1412 * 0.075) + ((2666.68 - 1412) * 0.09) + ((4000.03 - 2666.68) * 0.12) + ((bruto - 4000.03) * 0.14);
  else inss = 908.85; // Teto aproximado

  // 2. IRRF (Simplificado)
  const baseIR = bruto - inss;
  let irrf = 0;
  // Tabela Progressiva Simplificada
  if (baseIR <= 2259.20) irrf = 0;
  else if (baseIR <= 2826.65) irrf = (baseIR * 0.075) - 169.44;
  else if (baseIR <= 3751.05) irrf = (baseIR * 0.15) - 381.44;
  else if (baseIR <= 4664.68) irrf = (baseIR * 0.225) - 662.77;
  else irrf = (baseIR * 0.275) - 896.00;
  if (irrf < 0) irrf = 0;

  // 3. Custo Empresa (Estimativa - Lucro Presumido/Real)
  // FGTS (8%) + INSS Patronal (~20%) + RAT/FAP (~1% a 3%) + Terceiros (~5.8%)
  // Vamos usar um fator médio de 28.8% de encargos patronais + 8% FGTS
  const fgts = bruto * 0.08;
  const encargosPatronais = bruto * 0.288; // Exemplo médio
  const custoTotal = bruto + fgts + encargosPatronais;

  return {
    bruto,
    inss,
    irrf,
    fgts,
    liquido: bruto - inss - irrf,
    custoTotal,
    encargos: fgts + encargosPatronais
  };
};

export default function GestaoSalariosPage() {
  const { data: funcionarios, isLoading } = useSWR('getFuncionarios', getFuncionarios);
  const { mutate } = useSWRConfig();
  
  // Estado para Simulação de Reajuste
  const [modoReajuste, setModoReajuste] = useState(false);
  const [paramsReajuste, setParamsReajuste] = useState({ tipo: 'Porcentagem', valor: 5 });
  const [simulacao, setSimulacao] = useState([]);

  // Métricas Globais
  const metricas = useMemo(() => {
    if (!funcionarios) return null;
    return funcionarios.reduce((acc, func) => {
      if (func.status !== 'Ativo') return acc;
      
      const calculo = calcularCustos(func.salario_bruto);
      acc.totalBruto += calculo.bruto;
      acc.totalLiquido += calculo.liquido;
      acc.totalCustoEmpresa += calculo.custoTotal;
      acc.totalImpostosColaborador += (calculo.inss + calculo.irrf);
      return acc;
    }, { totalBruto: 0, totalLiquido: 0, totalCustoEmpresa: 0, totalImpostosColaborador: 0 });
  }, [funcionarios]);

  const handleSimular = async () => {
    if (!paramsReajuste.valor) {
        toast.error("Informe um valor para o reajuste.");
        return;
    }
    const resultado = await simularReajusteMassa({
      departamento: 'Todos', // Poderia ser filtro
      tipoReajuste: paramsReajuste.tipo,
      valor: parseFloat(paramsReajuste.valor),
      dataVigencia: new Date().toISOString()
    });
    setSimulacao(resultado);
    toast.success(`${resultado.length} colaboradores calculados na simulação.`);
  };

  const handleAplicar = async () => {
    if (!window.confirm(`Atenção! Isso alterará o salário de ${simulacao.length} pessoas no banco de dados e gerará histórico. Confirma?`)) return;
    try {
      await aplicarReajusteMassa(simulacao, `Reajuste em Massa: ${paramsReajuste.tipo} ${paramsReajuste.valor}`, new Date());
      toast.success("Reajuste aplicado com sucesso!");
      setModoReajuste(false);
      setSimulacao([]);
      mutate('getFuncionarios'); // Atualizar SWR
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div style={{padding: '40px', textAlign: 'center'}}>Carregando folha de pagamento...</div>;

  return (
    <div className="gestao-salarios-container">
      <div className="header-salarios">
        <div>
          <h1>Gestão de Salários e Custos</h1>
          <p>Visão analítica de folha, encargos estimados e reajustes em massa.</p>
        </div>
        <button className="btn-reajuste" onClick={() => setModoReajuste(!modoReajuste)}>
          <span className="material-symbols-outlined">trending_up</span>
          {modoReajuste ? 'Cancelar Simulação' : 'Simular Reajuste'}
        </button>
      </div>

      {/* CARDS DE KPI DE CUSTOS */}
      <div className="kpi-grid">
        <div className="kpi-card dark">
          <span>Custo Total Empresa (Est.)</span>
          <h3>R$ {metricas?.totalCustoEmpresa.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
          <small>Salários + Encargos (~36.8%)</small>
        </div>
        <div className="kpi-card">
          <span>Total Folha Bruta</span>
          <h3>R$ {metricas?.totalBruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
        </div>
        <div className="kpi-card">
          <span>Líquido aos Colaboradores</span>
          <h3>R$ {metricas?.totalLiquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
        </div>
        <div className="kpi-card danger">
          <span>Retenção (INSS/IRRF)</span>
          <h3>R$ {metricas?.totalImpostosColaborador.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
        </div>
      </div>

      {/* ÁREA DE SIMULAÇÃO (APARECE SÓ QUANDO ATIVA) */}
      {modoReajuste && (
        <div className="simulacao-box fade-in">
          <h4><span className="material-symbols-outlined">calculate</span> Simulador de Impacto Financeiro</h4>
          <div className="simulacao-controls">
            <select onChange={(e) => setParamsReajuste({...paramsReajuste, tipo: e.target.value})}>
              <option value="Porcentagem">Aumento em %</option>
              <option value="Valor Fixo">Aumento Valor Fixo (R$)</option>
              <option value="Novo Piso">Adequar ao Piso (R$)</option>
            </select>
            <input 
              type="number" 
              placeholder="Valor (ex: 5 para 5%)" 
              onChange={(e) => setParamsReajuste({...paramsReajuste, valor: e.target.value})}
            />
            <button className="btn-primary" onClick={handleSimular}>Calcular Impacto</button>
          </div>

          {simulacao.length > 0 && (
            <div className="resultado-simulacao">
              <p>Impacto Mensal: <strong style={{color: '#16a34a'}}>+ R$ {simulacao.reduce((acc, i) => acc + i.diferenca, 0).toLocaleString()}</strong> na folha bruta.</p>
              <button className="btn-success" onClick={handleAplicar}>Aplicar Reajuste Agora</button>
            </div>
          )}
        </div>
      )}

      {/* TABELA DETALHADA */}
      <div className="tabela-custos-wrapper">
        <table className="tabela-custos">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th>Salário Bruto</th>
              <th>Desc. INSS (Est.)</th>
              <th>Desc. IRRF (Est.)</th>
              <th>Salário Líquido (Est.)</th>
              <th>Custo Total Empresa</th>
            </tr>
          </thead>
          <tbody>
            {funcionarios?.filter(f => f.status === 'Ativo').map(func => {
              const calc = calcularCustos(func.salario_bruto);
              const diferencaSimulada = simulacao.find(s => s.id === func.id);

              return (
                <tr key={func.id} className={diferencaSimulada ? 'highlight-row' : ''}>
                  <td>
                    <div className="user-info">
                      <strong>{func.nome_completo}</strong>
                      <small>{func.cargo}</small>
                    </div>
                  </td>
                  <td>
                    R$ {calc.bruto.toLocaleString()}
                    {diferencaSimulada && <span className="diff-tag">➝ {diferencaSimulada.novo_salario.toLocaleString()}</span>}
                  </td>
                  <td className="text-danger">- {calc.inss.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                  <td className="text-danger">- {calc.irrf.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                  <td className="text-success"><strong>R$ {calc.liquido.toLocaleString(undefined, {maximumFractionDigits:2})}</strong></td>
                  <td className="text-muted">R$ {calc.custoTotal.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}