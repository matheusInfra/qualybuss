import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { 
  calcularPreviaFolha, 
  getFolhaPagamento, 
  salvarConferencia,
  getConfigFolha,
  saveConfigFolha
} from '../services/salarioService';
import './FuncionariosPage.css'; // Reutiliza CSS existente

export default function SalariosPage() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('conferencia'); // 'conferencia', 'transparencia', 'config'
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  
  // Dados
  const [folha, setFolha] = useState(null);
  const [config, setConfig] = useState(null);
  const [valorContabilidadeInput, setValorContabilidadeInput] = useState('');

  // Hooks
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  // --- EFEITOS ---
  
  // Carregar Configurações ao montar
  useEffect(() => {
    getConfigFolha()
      .then(setConfig)
      .catch(err => console.error("Erro ao carregar configs:", err));
  }, []);

  // Recarregar dados se filtros mudarem
  useEffect(() => {
    if (selectedFuncionario) carregarDados();
  }, [selectedFuncionario, mes, ano]);

  const carregarDados = async () => {
    try {
      const data = await getFolhaPagamento(selectedFuncionario, mes, ano);
      setFolha(data);
      if (data?.valor_contabilidade_liquido) {
        setValorContabilidadeInput(data.valor_contabilidade_liquido);
      } else {
        setValorContabilidadeInput('');
      }
    } catch (error) { console.error(error); }
  };

  // --- HANDLERS ---

  const handleCalcularPrevia = async () => {
    if (!selectedFuncionario) return toast.error("Selecione um colaborador");
    setLoading(true);
    try {
      const func = funcionarios.find(f => f.id === selectedFuncionario);
      await calcularPreviaFolha(func, mes, ano);
      await carregarDados();
      toast.success("Prévia gerada com base no ponto!");
    } catch (error) {
      toast.error("Erro ao calcular: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarConferencia = async () => {
    if (!folha) return;
    try {
      // Troca vírgula por ponto para float
      const valor = parseFloat(valorContabilidadeInput.toString().replace(',', '.'));
      if (isNaN(valor)) return toast.error("Valor inválido");

      const status = await salvarConferencia(folha.id, valor);
      await carregarDados();
      
      if (status === 'Ok') toast.success("Valores batem! Conferência concluída.");
      else toast.error("Valores divergentes. Verifique diferenças.");
    } catch (error) {
      toast.error("Erro ao salvar conferência.");
    }
  };

  const handleSalvarConfig = async (e) => {
    e.preventDefault();
    try { 
      await saveConfigFolha(config); 
      toast.success("Taxas e configurações atualizadas!"); 
    } catch (e) { 
      toast.error("Erro ao salvar."); 
    }
  };

  // --- RENDER ---

  return (
    <div className="funcionarios-container">
      
      {/* HEADER */}
      <div className="page-header" style={{borderBottom:'none', paddingBottom:0}}>
        <div>
          <h1>Gestão de Folha</h1>
          <p>Auditoria, Previsão e Conferência com Contabilidade.</p>
        </div>
        
        <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
          <button className={`btn-tab ${activeTab==='conferencia'?'active':''}`} onClick={()=>setActiveTab('conferencia')}>
            <span className="material-symbols-outlined">compare_arrows</span> Conferência
          </button>
          <button className={`btn-tab ${activeTab==='transparencia'?'active':''}`} onClick={()=>setActiveTab('transparencia')}>
            <span className="material-symbols-outlined">visibility</span> Memória
          </button>
          <button className={`btn-tab ${activeTab==='config'?'active':''}`} onClick={()=>setActiveTab('config')}>
            <span className="material-symbols-outlined">tune</span> Taxas
          </button>
        </div>
      </div>
      
      <hr style={{margin:'20px 0', border:0, borderTop:'1px solid #e2e8f0'}}/>

      {/* --- ABA CONFERÊNCIA --- */}
      {activeTab === 'conferencia' && (
        <div className="fade-in">
          {/* Barra de Filtros */}
          <div className="filter-bar" style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'20px', display:'flex', gap:'15px', alignItems:'flex-end'}}>
            <div style={{flex:1}}>
              <label>Colaborador</label>
              <select className="form-control" value={selectedFuncionario} onChange={e=>setSelectedFuncionario(e.target.value)}>
                <option value="">Selecione...</option>{funcionarios?.map(f=><option key={f.id} value={f.id}>{f.nome_completo}</option>)}
              </select>
            </div>
            <div style={{width:'100px'}}><label>Mês</label><input type="number" className="form-control" value={mes} onChange={e=>setMes(e.target.value)}/></div>
            <div style={{width:'120px'}}><label>Ano</label><input type="number" className="form-control" value={ano} onChange={e=>setAno(e.target.value)}/></div>
            <button className="btn-primary" onClick={handleCalcularPrevia} disabled={loading}>{loading?'Calculando...':'Gerar Prévia'}</button>
          </div>

          {folha ? (
            <div className="grid-2-col" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px'}}>
              
              {/* LADO ESQUERDO: SISTEMA */}
              <div className="holerite-card" style={{background:'white', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
                <div style={{padding:'15px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between'}}>
                  <strong>Cálculo do Sistema (Sombra)</strong>
                  {folha.memoria_calculo?.origem_dados === 'Integrado Ponto' && 
                    <span style={{fontSize:'0.7rem', background:'#dcfce7', color:'#166534', padding:'2px 8px', borderRadius:'10px', display:'flex', alignItems:'center'}}>
                      <span className="material-symbols-outlined" style={{fontSize:'12px', marginRight:2}}>sync</span>Ponto
                    </span>
                  }
                </div>
                <div style={{padding:'20px'}}>
                  <table style={{width:'100%', fontSize:'0.9rem'}}>
                    <tbody>
                      {folha.folha_itens?.map(item => (
                        <tr key={item.id} style={{borderBottom:'1px dashed #eee'}}>
                          <td style={{padding:'8px 0'}}>{item.descricao}</td>
                          <td style={{textAlign:'right', color: item.tipo==='Provento'?'#166534':'#dc2626'}}>
                            {item.tipo==='Desconto' ? '-' : ''} R$ {item.valor.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{borderTop:'2px solid #e2e8f0'}}>
                        <td style={{padding:'15px 0', fontWeight:'bold'}}>Líquido Previsto</td>
                        <td style={{padding:'15px 0', textAlign:'right', fontWeight:'bold', fontSize:'1.2rem', color:'#0f172a'}}>
                          R$ {folha.liquido_receber.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* LADO DIREITO: CONTABILIDADE */}
              <div className="conferencia-card" style={{background:'#f8fafc', borderRadius:'12px', border:'1px solid #cbd5e1', padding:'25px', display:'flex', flexDirection:'column', gap:'20px'}}>
                <h3 style={{marginTop:0, color:'#334155'}}>Conferência Contabilidade</h3>
                
                <div>
                  <label style={{display:'block', marginBottom:'5px', fontWeight:600}}>Valor Líquido (Holerite Oficial)</label>
                  <div style={{display:'flex', gap:'10px'}}>
                    <input className="form-control" style={{fontSize:'1.2rem', fontWeight:'bold', color:'#334155'}} placeholder="0.00" value={valorContabilidadeInput} onChange={e=>setValorContabilidadeInput(e.target.value)} />
                    <button className="btn-primary" onClick={handleSalvarConferencia}>Validar</button>
                  </div>
                </div>

                {folha.status_conferencia && (
                  <div style={{marginTop:'auto', padding:'20px', borderRadius:'8px', textAlign:'center', background: folha.status_conferencia==='Ok'?'#dcfce7':'#fee2e2', border: `1px solid ${folha.status_conferencia==='Ok'?'#86efac':'#fca5a5'}`}}>
                    {folha.status_conferencia === 'Ok' ? (
                      <>
                        <h2 style={{color:'#166534', margin:'0'}}>Valores Batem!</h2>
                        <p style={{color:'#15803d', margin:0}}>Diferença: R$ {folha.diferenca_identificada?.toFixed(2)}</p>
                      </>
                    ) : (
                      <>
                        <h2 style={{color:'#991b1b', margin:'0'}}>Divergência</h2>
                        <p style={{color:'#b91c1c', margin:0, fontWeight:'bold', fontSize:'1.2rem'}}>Diff: R$ {folha.diferenca_identificada?.toFixed(2)}</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{textAlign:'center', padding:'60px', color:'#94a3b8', border:'2px dashed #e2e8f0', borderRadius:'12px'}}>
              <span className="material-symbols-outlined" style={{fontSize:'48px'}}>fact_check</span>
              <p>Selecione um colaborador e clique em "Gerar Prévia" para iniciar.</p>
            </div>
          )}
        </div>
      )}

      {/* --- ABA MEMÓRIA DE CÁLCULO --- */}
      {activeTab === 'transparencia' && folha && (
        <div className="fade-in" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
          <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
            <h3>Dados Usados</h3>
            <pre style={{fontSize:'0.8rem', background:'#f8fafc', padding:10, borderRadius:6, overflow:'auto'}}>{JSON.stringify(folha.memoria_calculo, null, 2)}</pre>
          </div>
          <div style={{background:'#fff7ed', padding:'20px', borderRadius:'12px', border:'1px solid #fed7aa'}}>
            <h3>Custos Empresa</h3>
            <p>Total: <strong>R$ {folha.custo_total_empresa.toFixed(2)}</strong></p>
          </div>
        </div>
      )}

      {/* --- ABA CONFIGURAÇÃO --- */}
      {activeTab === 'config' && config && (
        <div className="fade-in">
          <form onSubmit={handleSalvarConfig} style={{background:'white', padding:'30px', borderRadius:'12px', border:'1px solid #e2e8f0'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'30px'}}><h3>Parâmetros Fiscais</h3><button className="btn-primary">Salvar</button></div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px'}}>
              <div>
                <h4>Encargos Empresa (%)</h4>
                <div className="form-group"><label>INSS Patronal</label><input type="number" step="0.1" className="form-control" value={config.aliquota_patronal} onChange={e=>setConfig({...config, aliquota_patronal:e.target.value})} /></div>
                <div className="form-group"><label>FGTS</label><input type="number" step="0.1" className="form-control" value={config.aliquota_fgts} onChange={e=>setConfig({...config, aliquota_fgts:e.target.value})} /></div>
              </div>
              <div>
                <h4>Deduções (R$)</h4>
                <div className="form-group"><label>Por Dependente</label><input type="number" step="0.01" className="form-control" value={config.deducao_por_dependente} onChange={e=>setConfig({...config, deducao_por_dependente:e.target.value})} /></div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}