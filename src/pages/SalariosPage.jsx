import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  calcularEListarFolha, 
  getAnalyticsFolha, 
  getConfigFolha, 
  saveConfigFolha 
} from '../services/salarioService';
import './SalariosPage.css'; // Criar este arquivo com o CSS abaixo

export default function SalariosPage() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, analytics, config
  const [loading, setLoading] = useState(false);
  const [dataCompetencia, setDataCompetencia] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Dados
  const [listaFolha, setListaFolha] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [config, setConfig] = useState(null);

  // --- CARGA DE DADOS ---
  useEffect(() => {
    carregarDados();
  }, [dataCompetencia, activeTab]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const dados = await calcularEListarFolha(dataCompetencia);
        setListaFolha(dados);
      } else if (activeTab === 'analytics') {
        const dados = await getAnalyticsFolha(dataCompetencia);
        setAnalytics(dados);
      } else if (activeTab === 'config') {
        const dados = await getConfigFolha();
        setConfig(dados);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await saveConfigFolha(config);
      toast.success("Configurações tributárias salvas!");
    } catch (e) {
      toast.error("Erro ao salvar.");
    }
  };

  // --- RENDER ---
  return (
    <div className="salario-container fade-in">
      
      {/* HEADER */}
      <div className="salario-header">
        <div>
          <h1>Gestão de Salários</h1>
          <p>Visão estratégica da folha de pagamento.</p>
        </div>
        
        {/* DATA SELECTOR */}
        <div className="competencia-selector">
          <label>Competência:</label>
          <input 
            type="month" 
            value={dataCompetencia} 
            onChange={e => setDataCompetencia(e.target.value)} 
          />
        </div>
      </div>

      {/* TABS */}
      <div className="tabs-nav">
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
          <span className="material-symbols-outlined">dashboard</span> Dashboard Colaboradores
        </button>
        <button className={activeTab === 'analytics' ? 'active' : ''} onClick={() => setActiveTab('analytics')}>
          <span className="material-symbols-outlined">analytics</span> Analytics da Empresa
        </button>
        <button className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}>
          <span className="material-symbols-outlined">settings</span> Configuração Tributária
        </button>
      </div>

      {/* CONTEÚDO */}
      <div className="tab-content">
        
        {/* ABA 1: DASHBOARD (CARDS) */}
        {activeTab === 'dashboard' && (
          <div className="cards-grid">
            {listaFolha.length === 0 ? (
              <div className="empty-state">Nenhum funcionário ativo encontrado.</div>
            ) : (
              listaFolha.map((item, idx) => (
                <div key={idx} className="salary-card">
                  <div className="card-header">
                    <div className="avatar-placeholder">{item.funcionario.nome_completo.charAt(0)}</div>
                    <div>
                      <h3>{item.funcionario.nome_completo}</h3>
                      <span>{item.funcionario.cargo}</span>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <div className="row-value">
                      <span className="label">Salário Bruto</span>
                      <span className="value">R$ {item.financeiro.bruto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="row-value discount">
                      <span className="label">Descontos (INSS/IRRF)</span>
                      <span className="value">- R$ {item.financeiro.descontos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="divider"></div>
                    <div className="row-value highlight">
                      <span className="label">Líquido a Receber</span>
                      <span className="value net">R$ {item.financeiro.liquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>

                  <div className="card-footer-cost">
                    <small>Custo Total Empresa</small>
                    <strong>R$ {item.empresa.custo_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA 2: ANALYTICS */}
        {activeTab === 'analytics' && analytics && (
          <div className="analytics-view">
            <div className="kpi-row">
              <div className="kpi-box primary">
                <h3>Custo Total Folha</h3>
                <h1>R$ {analytics.custo_empresa_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h1>
                <p>Valor total que sai do caixa da empresa</p>
              </div>
              <div className="kpi-box">
                <h3>Total Líquido (Pagamentos)</h3>
                <h2>R$ {analytics.liquido_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
              </div>
              <div className="kpi-box">
                <h3>Impostos Retidos (Guia)</h3>
                <h2>R$ {analytics.impostos_retidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h2>
              </div>
            </div>

            <div className="chart-container">
              <h3>Distribuição do Custo</h3>
              <div className="bar-chart">
                <div className="bar-group">
                  <div className="bar-label">Salários Líquidos</div>
                  <div className="bar-fill" style={{width: `${(analytics.liquido_total / analytics.custo_empresa_total) * 100}%`, background: '#22c55e'}}></div>
                  <div className="bar-value">{((analytics.liquido_total / analytics.custo_empresa_total) * 100).toFixed(1)}%</div>
                </div>
                <div className="bar-group">
                  <div className="bar-label">Impostos Retidos</div>
                  <div className="bar-fill" style={{width: `${(analytics.impostos_retidos / analytics.custo_empresa_total) * 100}%`, background: '#ef4444'}}></div>
                  <div className="bar-value">{((analytics.impostos_retidos / analytics.custo_empresa_total) * 100).toFixed(1)}%</div>
                </div>
                <div className="bar-group">
                  <div className="bar-label">Encargos Empresa (Patronal/FGTS)</div>
                  <div className="bar-fill" style={{width: `${((analytics.custo_empresa_total - analytics.bruto_total) / analytics.custo_empresa_total) * 100}%`, background: '#f97316'}}></div>
                  <div className="bar-value">{(((analytics.custo_empresa_total - analytics.bruto_total) / analytics.custo_empresa_total) * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: CONFIGURAÇÃO */}
        {activeTab === 'config' && config && (
          <div className="config-view">
            <form onSubmit={handleSaveConfig} className="config-form">
              <div className="form-header">
                <h3>Parâmetros Fiscais da Empresa</h3>
                <button type="submit" className="btn-save">Salvar Alterações</button>
              </div>

              <div className="form-grid">
                <div className="form-section">
                  <h4>Encargos Patronais (%)</h4>
                  <div className="input-group">
                    <label>INSS Patronal</label>
                    <input type="number" step="0.1" value={config.aliquota_patronal} onChange={e=>setConfig({...config, aliquota_patronal: e.target.value})} />
                    <small>Geralmente 20% (0% se Simples Nacional)</small>
                  </div>
                  <div className="input-group">
                    <label>RAT (Risco Ambiental)</label>
                    <input type="number" step="0.1" value={config.aliquota_rat} onChange={e=>setConfig({...config, aliquota_rat: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>FAP (Fator Acidentário)</label>
                    <input type="number" step="0.0001" value={config.aliquota_fap} onChange={e=>setConfig({...config, aliquota_fap: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>FGTS</label>
                    <input type="number" step="0.1" value={config.aliquota_fgts} onChange={e=>setConfig({...config, aliquota_fgts: e.target.value})} />
                  </div>
                </div>

                <div className="form-section">
                  <h4>Deduções Legais (R$)</h4>
                  <div className="input-group">
                    <label>Dedução por Dependente (IRRF)</label>
                    <input type="number" step="0.01" value={config.deducao_por_dependente} onChange={e=>setConfig({...config, deducao_por_dependente: e.target.value})} />
                  </div>
                  <div className="info-box">
                    <span className="material-symbols-outlined">info</span>
                    <p>As tabelas progressivas de INSS e IRRF são atualizadas automaticamente pelo sistema, mas podem ser ajustadas via banco de dados se necessário.</p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}