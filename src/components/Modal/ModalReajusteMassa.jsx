import React, { useState, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useSWRConfig } from 'swr';
import { simularReajusteMassa, aplicarReajusteMassa } from '../../services/movimentacaoService';
import { getFuncionarios } from '../../services/funcionarioService';
import useSWR from 'swr';
import './ModalReajusteMassa.css';

function ModalReajusteMassa({ onClose }) {
  const [step, setStep] = useState(1); // 1: Config, 2: Preview
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();

  // Estado do Formulário
  const [config, setConfig] = useState({
    departamento: 'Todos',
    tipoReajuste: 'Porcentagem', // Porcentagem | Valor Fixo | Novo Piso
    valor: '',
    dataVigencia: new Date().toISOString().split('T')[0],
    motivo: 'Dissídio Coletivo 2025'
  });

  const [simulacao, setSimulacao] = useState([]);
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('');

  // Busca departamentos para o filtro
  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);
  const departamentos = useMemo(() => {
    if (!funcionarios) return ['Todos'];
    const deps = new Set(funcionarios.map(f => f.departamento).filter(Boolean));
    return ['Todos', ...Array.from(deps)];
  }, [funcionarios]);

  // --- PASSO 1: SIMULAR ---
  const handleSimular = async () => {
    if (!config.valor || Number(config.valor) <= 0) {
      return toast.error("Informe um valor válido.");
    }
    setLoading(true);
    try {
      const resultado = await simularReajusteMassa({
        departamento: config.departamento,
        tipoReajuste: config.tipoReajuste,
        valor: Number(config.valor),
        dataVigencia: config.dataVigencia
      });
      
      if (resultado.length === 0) {
        toast("Nenhum funcionário elegível para este critério.", { icon: '⚠️' });
      } else {
        setSimulacao(resultado);
        setStep(2);
      }
    } catch (e) {
      toast.error("Erro ao simular: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- PASSO 2: APLICAR ---
  const handleAplicar = async () => {
    if (confirmacaoTexto !== 'CONFIRMAR') {
      return toast.error("Digite CONFIRMAR para prosseguir.");
    }
    
    setLoading(true);
    const toastId = toast.loading("Aplicando reajustes...");
    try {
      await aplicarReajusteMassa(simulacao, config.motivo, config.dataVigencia);
      
      toast.success("Reajuste aplicado com sucesso!", { id: toastId });
      
      // Atualiza tudo
      mutate('getFuncionarios');
      mutate('todasMovimentacoes');
      mutate('dashboard_kpis');
      
      onClose();
    } catch (e) {
      toast.error("Erro crítico: " + e.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Cálculos de Resumo
  const totalImpacto = simulacao.reduce((acc, item) => acc + item.diferenca, 0);
  const totalSalariosNovo = simulacao.reduce((acc, item) => acc + item.novo_salario, 0);

  return (
    <div className="modal-overlay-reajuste">
      <div className="modal-card-reajuste">
        
        <div className="modal-header-reajuste">
          <h3>💰 Reajuste Salarial em Massa</h3>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="modal-body-reajuste">
          
          {/* PASSO 1: CONFIGURAÇÃO */}
          {step === 1 && (
            <div className="step-config">
              <div className="form-grid">
                <div className="form-group">
                  <label>Público Alvo (Departamento)</label>
                  <select 
                    value={config.departamento} 
                    onChange={e => setConfig({...config, departamento: e.target.value})}
                  >
                    {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Regra de Reajuste</label>
                  <select 
                    value={config.tipoReajuste} 
                    onChange={e => setConfig({...config, tipoReajuste: e.target.value})}
                  >
                    <option value="Porcentagem">Aplicar % (Dissídio)</option>
                    <option value="Valor Fixo">Soma Valor Fixo (+ R$)</option>
                    <option value="Novo Piso">Adequar ao Piso (Mínimo)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    {config.tipoReajuste === 'Porcentagem' ? 'Percentual (%)' : 'Valor (R$)'}
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={config.valor}
                    onChange={e => setConfig({...config, valor: e.target.value})}
                    placeholder={config.tipoReajuste === 'Porcentagem' ? 'Ex: 5.5' : 'Ex: 1500.00'}
                  />
                </div>

                <div className="form-group">
                  <label>Data de Vigência</label>
                  <input 
                    type="date" 
                    value={config.dataVigencia}
                    onChange={e => setConfig({...config, dataVigencia: e.target.value})}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Motivo (Para Histórico)</label>
                  <input 
                    type="text" 
                    value={config.motivo}
                    onChange={e => setConfig({...config, motivo: e.target.value})}
                  />
                </div>
              </div>

              <div className="modal-footer-reajuste">
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button onClick={handleSimular} className="btn-primary" disabled={loading}>
                  {loading ? 'Calculando...' : 'Simular Impacto ➝'}
                </button>
              </div>
            </div>
          )}

          {/* PASSO 2: CONFERÊNCIA E SEGURANÇA */}
          {step === 2 && (
            <div className="step-preview">
              <div className="impacto-summary">
                <div className="kpi-impacto">
                  <span>Colaboradores Afetados</span>
                  <strong>{simulacao.length}</strong>
                </div>
                <div className="kpi-impacto">
                  <span>Impacto Mensal (+Encargos)</span>
                  <strong className="text-red">+ R$ {totalImpacto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                </div>
                <div className="kpi-impacto">
                  <span>Nova Folha Base</span>
                  <strong className="text-blue">R$ {totalSalariosNovo.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                </div>
              </div>

              <div className="tabela-preview-wrapper">
                <table className="tabela-preview">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Cargo</th>
                      <th>Atual (R$)</th>
                      <th>Novo (R$)</th>
                      <th>Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulacao.map(item => (
                      <tr key={item.id}>
                        <td>{item.nome}</td>
                        <td>{item.cargo}</td>
                        <td>{item.salario_atual.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        <td className="font-bold">{item.novo_salario.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        <td className="text-green">+{item.diferenca.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="security-check">
                <p>⚠️ <strong>Atenção:</strong> Esta ação é irreversível em massa. Digite <code>CONFIRMAR</code> abaixo para processar.</p>
                <input 
                  type="text" 
                  placeholder="Digite CONFIRMAR"
                  value={confirmacaoTexto}
                  onChange={e => setConfirmacaoTexto(e.target.value.toUpperCase())}
                  className={confirmacaoTexto === 'CONFIRMAR' ? 'valid' : ''}
                />
              </div>

              <div className="modal-footer-reajuste">
                <button onClick={() => setStep(1)} className="btn-secondary">Voltar</button>
                <button 
                  onClick={handleAplicar} 
                  className="btn-danger" 
                  disabled={loading || confirmacaoTexto !== 'CONFIRMAR'}
                >
                  {loading ? 'Processando...' : 'Aplicar Reajuste Definitivo'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default ModalReajusteMassa;