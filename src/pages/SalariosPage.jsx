import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

// Serviços
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { 
  calcularESalvarFolha, 
  getFolhaPagamento, 
  getConfigFolha, 
  saveConfigFolha 
} from '../services/salarioService';

// Estilos
import './FuncionariosPage.css'; // Reutiliza estilos base
// Você pode criar um SalariosPage.css específico se quiser customizar mais

export default function SalariosPage() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('geral'); // 'geral', 'transparencia', 'config'
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  
  // Dados
  const [folha, setFolha] = useState(null);
  const [config, setConfig] = useState(null); // Taxas editáveis

  // Hooks
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  // --- EFEITOS ---
  
  // Carregar Configurações Fiscais ao iniciar
  useEffect(() => {
    getConfigFolha()
      .then(data => setConfig(data))
      .catch(err => console.error("Erro ao carregar configs:", err));
  }, []);

  // --- HANDLERS ---

  const handleCalcular = async () => {
    if (!selectedFuncionario) return toast.error("Selecione um colaborador");
    
    setLoading(true);
    try {
      const func = funcionarios.find(f => f.id === selectedFuncionario);
      
      // 1. Calcula (Integra com Ponto e Configurações no backend)
      await calcularESalvarFolha(func, mes, ano);
      
      // 2. Busca o resultado processado
      const resultado = await getFolhaPagamento(func.id, mes, ano);
      setFolha(resultado);
      
      toast.success("Cálculo da folha realizado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar folha: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    if (!config) return;

    try {
      await saveConfigFolha(config);
      toast.success("Taxas e configurações atualizadas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações.");
    }
  };

  // --- RENDERIZAÇÃO ---

  return (
    <div className="funcionarios-container">
      
      {/* HEADER E NAVEGAÇÃO */}
      <div className="page-header" style={{borderBottom:'none', paddingBottom:0}}>
        <div>
          <h1>Gestão de Salários</h1>
          <p>Cálculo de folha, encargos e integração com ponto.</p>
        </div>
        
        <div style={{display:'flex', gap:'10px', marginTop:'15px', overflowX: 'auto'}}>
          <button 
            className={`btn-tab ${activeTab === 'geral' ? 'active' : ''}`} 
            onClick={() => setActiveTab('geral')}
            style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: activeTab === 'geral' ? '#e2e8f0' : 'white', cursor: 'pointer', fontWeight: 600}}
          >
            <span className="material-symbols-outlined" style={{verticalAlign: 'middle', marginRight: '5px'}}>receipt_long</span> 
            Holerite
          </button>
          <button 
            className={`btn-tab ${activeTab === 'transparencia' ? 'active' : ''}`} 
            onClick={() => setActiveTab('transparencia')}
            style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: activeTab === 'transparencia' ? '#e2e8f0' : 'white', cursor: 'pointer', fontWeight: 600}}
          >
            <span className="material-symbols-outlined" style={{verticalAlign: 'middle', marginRight: '5px'}}>visibility</span> 
            Transparência
          </button>
          <button 
            className={`btn-tab ${activeTab === 'config' ? 'active' : ''}`} 
            onClick={() => setActiveTab('config')}
            style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: activeTab === 'config' ? '#e2e8f0' : 'white', cursor: 'pointer', fontWeight: 600}}
          >
            <span className="material-symbols-outlined" style={{verticalAlign: 'middle', marginRight: '5px'}}>tune</span> 
            Configuração
          </button>
        </div>
      </div>

      <hr style={{border: '0', borderTop: '1px solid #e2e8f0', margin: '20px 0'}} />

      {/* --- ABA 1: VISÃO GERAL (HOLERITE) --- */}
      {activeTab === 'geral' && (
        <div className="fade-in">
          {/* Barra de Filtros */}
          <div className="filter-bar" style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'20px', display:'flex', gap:'15px', alignItems:'flex-end', flexWrap: 'wrap'}}>
            <div style={{flex:1, minWidth: '200px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#64748b'}}>Colaborador</label>
              <select 
                className="form-control" 
                value={selectedFuncionario} 
                onChange={e => setSelectedFuncionario(e.target.value)}
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}}
              >
                <option value="">Selecione um colaborador...</option>
                {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
              </select>
            </div>
            <div style={{width:'100px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#64748b'}}>Mês</label>
              <input 
                type="number" 
                className="form-control" 
                value={mes} 
                onChange={e=>setMes(e.target.value)}
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}}
              />
            </div>
            <div style={{width:'120px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#64748b'}}>Ano</label>
              <input 
                type="number" 
                className="form-control" 
                value={ano} 
                onChange={e=>setAno(e.target.value)}
                style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1'}}
              />
            </div>
            <button 
              className="btn-primary" 
              onClick={handleCalcular} 
              disabled={loading}
              style={{background: '#0f172a', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600}}
            >
              {loading ? 'Calculando...' : 'Processar Folha'}
            </button>
          </div>

          {folha ? (
            <div className="holerite-card" style={{background:'white', borderRadius:'12px', border:'1px solid #e2e8f0', overflow:'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
              <div style={{padding:'20px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                <div>
                  <h3 style={{margin: 0, color: '#334155'}}>Demonstrativo de Pagamento</h3>
                  
                  {/* Badge de Integração */}
                  {folha.memoria_calculo?.origem_dados === 'Integrado Ponto' && (
                    <span style={{
                      fontSize:'0.75rem', 
                      background:'#dcfce7', 
                      color:'#166534', 
                      padding:'4px 10px', 
                      borderRadius:'20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginTop: '5px',
                      fontWeight: 600
                    }}>
                      <span className="material-symbols-outlined" style={{fontSize:'14px', marginRight:'4px'}}>sync</span>
                      Sincronizado com Ponto
                    </span>
                  )}
                </div>
                <span style={{fontWeight: 600, color: '#64748b'}}>Competência: {String(mes).padStart(2, '0')}/{ano}</span>
              </div>
              
              <div style={{padding: '20px'}}>
                <table style={{width:'100%', borderCollapse:'collapse', fontSize: '0.95rem'}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #e2e8f0', color:'#64748b'}}>
                      <th style={{padding:'12px', textAlign:'left'}}>Evento</th>
                      <th style={{padding:'12px', textAlign:'center'}}>Referência</th>
                      <th style={{padding:'12px', textAlign:'right'}}>Proventos</th>
                      <th style={{padding:'12px', textAlign:'right'}}>Descontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folha.folha_itens?.map(item => (
                      <tr key={item.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                        <td style={{padding:'12px', fontWeight: 500, color: '#334155'}}>{item.descricao}</td>
                        <td style={{padding:'12px', textAlign:'center', color: '#64748b'}}>
                          {item.referencia > 0 ? item.referencia : '-'}
                        </td>
                        <td style={{padding:'12px', textAlign:'right', color:'#16a34a', fontWeight: 500}}>
                          {item.tipo === 'Provento' ? item.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : ''}
                        </td>
                        <td style={{padding:'12px', textAlign:'right', color:'#dc2626', fontWeight: 500}}>
                          {item.tipo === 'Desconto' ? item.valor.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'}) : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#f8fafc'}}>
                      <td colSpan="2" style={{padding:'15px', fontWeight:'bold', color: '#475569'}}>TOTAIS</td>
                      <td style={{padding:'15px', textAlign:'right', fontWeight:'bold', color:'#16a34a'}}>
                        {folha.total_proventos.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                      </td>
                      <td style={{padding:'15px', textAlign:'right', fontWeight:'bold', color:'#dc2626'}}>
                        {folha.total_descontos.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                      </td>
                    </tr>
                    <tr style={{background:'#f0f9ff', borderTop: '2px solid #bae6fd'}}>
                      <td colSpan="2" style={{padding:'15px', fontWeight:'bold', color:'#0369a1'}}>LÍQUIDO A RECEBER</td>
                      <td colSpan="2" style={{padding:'15px', textAlign:'right', fontSize:'1.4rem', fontWeight:'800', color:'#0284c7'}}>
                        {folha.liquido_receber.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div style={{padding:'60px', textAlign:'center', color:'#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px'}}>
              <span className="material-symbols-outlined" style={{fontSize: '48px', marginBottom: '10px', opacity: 0.5}}>calculate</span>
              <p>Selecione um colaborador e clique em <strong>Processar Folha</strong> para ver o cálculo.</p>
            </div>
          )}
        </div>
      )}

      {/* --- ABA 2: TRANSPARÊNCIA (MEMÓRIA DE CÁLCULO) --- */}
      {activeTab === 'transparencia' && (
        <div className="fade-in">
          {folha && folha.memoria_calculo ? (
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:'20px'}}>
              
              {/* Card Colaborador */}
              <div style={{background:'white', padding:'25px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="material-symbols-outlined" style={{color: '#6366f1'}}>person</span> 
                  Memória de Cálculo (Colaborador)
                </h3>
                <div style={{marginTop:'20px', fontSize:'0.95rem', color:'#475569', display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0'}}>
                    <span>Base de Cálculo INSS</span>
                    <strong>R$ {folha.salario_base.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0'}}>
                    <span>Método IRRF Aplicado</span>
                    <span style={{background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600}}>
                      {folha.memoria_calculo.metodo_irrf}
                    </span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #e2e8f0'}}>
                    <span>Base de Cálculo IRRF</span>
                    <strong>R$ {folha.memoria_calculo.base_irrf?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                  </div>
                  
                  <div style={{marginTop: '15px'}}>
                    <strong style={{display: 'block', marginBottom: '8px', color: '#334155'}}>Faixas INSS Utilizadas:</strong>
                    <div style={{background: '#f8fafc', borderRadius: '8px', padding: '10px'}}>
                      {folha.memoria_calculo.tabela_inss_usada?.map((faixa, i) => (
                        <div key={i} style={{fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                          <span>Até R$ {faixa.limite.toLocaleString()}</span>
                          <strong>{faixa.aliquota}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Empresa */}
              <div style={{background:'#fff7ed', padding:'25px', borderRadius:'12px', border:'1px solid #fed7aa'}}>
                <h3 style={{marginTop: 0, color:'#9a3412', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className="material-symbols-outlined">domain</span> 
                  Encargos da Empresa
                </h3>
                <p style={{marginBottom:'20px', color:'#c2410c', fontSize: '0.9rem'}}>
                  Custo efetivo para o empregador (não descontado do colaborador).
                </p>
                
                <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span>FGTS ({folha.memoria_calculo.aliquotas_empresa?.fgts}%)</span>
                    <strong>R$ {(folha.salario_base * (folha.memoria_calculo.aliquotas_empresa?.fgts/100)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span>INSS Patronal ({folha.memoria_calculo.aliquotas_empresa?.patronal}%)</span>
                    <strong>R$ {(folha.salario_base * (folha.memoria_calculo.aliquotas_empresa?.patronal/100)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span>RAT/FAP ({folha.memoria_calculo.aliquotas_empresa?.rat}%)</span>
                    <strong>R$ {(folha.salario_base * (folha.memoria_calculo.aliquotas_empresa?.rat/100)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
                  </div>
                  
                  <hr style={{borderColor:'#fdba74', margin: '10px 0'}}/>
                  
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'1.2rem', color:'#9a3412', fontWeight: 700}}>
                    <span>Custo Total Mês</span>
                    <span>{folha.custo_total_empresa.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{padding:'60px', textAlign:'center', color:'#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '12px'}}>
              <span className="material-symbols-outlined" style={{fontSize: '48px', marginBottom: '10px', opacity: 0.5}}>visibility_off</span>
              <p>Processe uma folha primeiro para visualizar a memória de cálculo detalhada.</p>
            </div>
          )}
        </div>
      )}

      {/* --- ABA 3: CONFIGURAÇÕES (PARAMETRIZAÇÃO) --- */}
      {activeTab === 'config' && (
        <div className="fade-in">
          {config ? (
            <form onSubmit={handleSalvarConfig} style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px', alignItems: 'center'}}>
                <div>
                  <h3 style={{margin: 0}}>Parâmetros Fiscais</h3>
                  <p style={{color: '#64748b', margin: '5px 0 0 0'}}>Defina as alíquotas vigentes para garantir a precisão do cálculo.</p>
                </div>
                <button type="submit" className="btn-primary" style={{background: '#2563eb', color: 'white', padding: '10px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600}}>
                  Salvar Alterações
                </button>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'40px'}}>
                {/* Coluna 1: Encargos Empresa */}
                <div>
                  <h4 style={{borderBottom:'2px solid #e2e8f0', paddingBottom:'10px', marginBottom:'20px', color: '#334155'}}>Encargos Empresa (%)</h4>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                    <div className="form-group">
                      <label style={{display: 'block', fontWeight: 600, marginBottom: '5px', color: '#475569'}}>INSS Patronal</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        className="form-control" 
                        value={config.aliquota_patronal} 
                        onChange={e=>setConfig({...config, aliquota_patronal: e.target.value})} 
                        style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px'}}
                      />
                      <small style={{color: '#94a3b8'}}>Padrão: 20%</small>
                    </div>
                    <div className="form-group">
                      <label style={{display: 'block', fontWeight: 600, marginBottom: '5px', color: '#475569'}}>RAT (Risco Ambiental)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        className="form-control" 
                        value={config.aliquota_rat} 
                        onChange={e=>setConfig({...config, aliquota_rat: e.target.value})} 
                        style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px'}}
                      />
                      <small style={{color: '#94a3b8'}}>Varia conforme CNAE (1% a 3%)</small>
                    </div>
                    <div className="form-group">
                      <label style={{display: 'block', fontWeight: 600, marginBottom: '5px', color: '#475569'}}>FGTS</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        className="form-control" 
                        value={config.aliquota_fgts} 
                        onChange={e=>setConfig({...config, aliquota_fgts: e.target.value})} 
                        style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px'}}
                      />
                      <small style={{color: '#94a3b8'}}>Padrão: 8%</small>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Deduções */}
                <div>
                  <h4 style={{borderBottom:'2px solid #e2e8f0', paddingBottom:'10px', marginBottom:'20px', color: '#334155'}}>Deduções Legais (R$)</h4>
                  <div className="form-group">
                    <label style={{display: 'block', fontWeight: 600, marginBottom: '5px', color: '#475569'}}>Dedução por Dependente (IRRF)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      value={config.deducao_por_dependente} 
                      onChange={e=>setConfig({...config, deducao_por_dependente: e.target.value})} 
                      style={{width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px'}}
                    />
                    <small style={{color: '#94a3b8'}}>Valor atual: R$ 189,59</small>
                  </div>
                  
                  <div className="alert-box" style={{background:'#f0f9ff', padding:'15px', borderRadius:'8px', marginTop:'25px', border: '1px solid #bae6fd', color: '#0369a1', display: 'flex', gap: '10px'}}>
                    <span className="material-symbols-outlined">info</span>
                    <p style={{margin: 0, fontSize: '0.9rem'}}>
                      As tabelas progressivas de <strong>INSS</strong> e <strong>IRRF</strong> são carregadas automaticamente do banco de dados. Para alterar as faixas salariais, contate o administrador do sistema.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div style={{padding:'40px', textAlign:'center'}}>
              <span className="loader-spinner"></span>
              <p>Carregando configurações...</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}