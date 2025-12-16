import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { 
  getRubricas, 
  createRubrica, 
  getMovimentosCompetencia, 
  saveMovimento, 
  calcularFolhaMensal,
  getFolhaPagamento
} from '../services/salarioService';
import './FuncionariosPage.css';

export default function SalariosPage() {
  const [activeTab, setActiveTab] = useState('lancamentos'); 
  const [loading, setLoading] = useState(false);
  
  // Filtros Globais
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const competencia = `${ano}-${String(mes).padStart(2, '0')}-01`;

  // Dados
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);
  const { data: rubricas, mutate: mutateRubricas } = useSWR('getRubricas', getRubricas);
  const { data: movimentos, mutate: mutateMovimentos } = useSWR(['getMovimentos', competencia], () => getMovimentosCompetencia(competencia));

  // Estado para Análise Individual
  const [funcionarioAnalise, setFuncionarioAnalise] = useState(null);
  const [folhaAnalise, setFolhaAnalise] = useState(null);

  // Nova Rubrica
  const [novaRubrica, setNovaRubrica] = useState({ codigo: '', nome: '', tipo: 'Provento' });

  // Handlers
  const handleSalvarMovimento = async (funcId, rubricaId, valor) => {
    try {
      if (!valor || valor <= 0) return; 
      await saveMovimento({
        funcionario_id: funcId,
        rubrica_id: rubricaId,
        competencia,
        valor: parseFloat(valor),
        referencia: 0
      });
      mutateMovimentos();
      toast.success("Salvo!", { duration: 1000 });
    } catch (e) {
      toast.error("Erro ao salvar.");
    }
  };

  const handleCalcularTudo = async () => {
    setLoading(true);
    try {
      const qtd = await calcularFolhaMensal(competencia);
      toast.success(`${qtd} folhas calculadas com sucesso!`);
      setActiveTab('analise');
    } catch (e) {
      toast.error("Erro no cálculo: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCriarRubrica = async () => {
    try {
      await createRubrica(novaRubrica);
      mutateRubricas();
      setNovaRubrica({ codigo: '', nome: '', tipo: 'Provento' });
      toast.success("Rubrica criada!");
    } catch (e) { toast.error("Erro ao criar rubrica."); }
  };

  const carregarAnaliseIndividual = async (funcId) => {
    setFuncionarioAnalise(funcId);
    const dados = await getFolhaPagamento(funcId, mes, ano);
    setFolhaAnalise(dados);
  };

  return (
    <div className="funcionarios-container">
      <div className="page-header" style={{borderBottom:'none', paddingBottom:0}}>
        <div><h1>Gestão de Folha</h1><p>Lançamentos, Rubricas e Cálculo.</p></div>
        <div style={{display:'flex', gap:10, marginTop:15}}>
          <button className={`btn-tab ${activeTab==='lancamentos'?'active':''}`} onClick={()=>setActiveTab('lancamentos')}>Lançamentos (Grade)</button>
          <button className={`btn-tab ${activeTab==='analise'?'active':''}`} onClick={()=>setActiveTab('analise')}>Análise / Holerite</button>
          <button className={`btn-tab ${activeTab==='rubricas'?'active':''}`} onClick={()=>setActiveTab('rubricas')}>Rubricas</button>
        </div>
      </div>
      <hr style={{margin:'20px 0', border:0, borderTop:'1px solid #eee'}}/>

      {/* ABA 1: LANÇAMENTOS (GRADE) */}
      {activeTab === 'lancamentos' && (
        <div className="fade-in">
          <div className="filter-bar" style={{background:'white', padding:15, borderRadius:8, marginBottom:20, display:'flex', gap:10, alignItems:'center'}}>
            <label>Competência:</label>
            <input type="number" className="form-control" style={{width:70}} value={mes} onChange={e=>setMes(e.target.value)}/>
            <span>/</span>
            <input type="number" className="form-control" style={{width:90}} value={ano} onChange={e=>setAno(e.target.value)}/>
            <button className="btn-primary" style={{marginLeft:'auto'}} onClick={handleCalcularTudo} disabled={loading}>
              {loading ? 'Calculando...' : 'Calcular Folha do Mês'}
            </button>
          </div>

          <div style={{overflowX:'auto', background:'white', borderRadius:12, border:'1px solid #e2e8f0'}}>
            <table style={{width:'100%', borderCollapse:'collapse', minWidth:'800px'}}>
              <thead style={{background:'#f8fafc'}}>
                <tr>
                  <th style={{padding:12, textAlign:'left', borderBottom:'1px solid #e2e8f0', position:'sticky', left:0, background:'#f8fafc', zIndex:10}}>Colaborador</th>
                  {rubricas?.map(r => (
                    <th key={r.id} style={{padding:12, textAlign:'center', borderBottom:'1px solid #e2e8f0', fontSize:'0.85rem', color:'#64748b'}}>
                      {r.nome} <br/><small>({r.tipo})</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {funcionarios?.map(func => (
                  <tr key={func.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                    <td style={{padding:12, fontWeight:500, position:'sticky', left:0, background:'white', borderRight:'1px solid #f1f5f9'}}>{func.nome_completo}</td>
                    {rubricas?.map(r => {
                      const mov = movimentos?.find(m => m.funcionario_id === func.id && m.rubrica_id === r.id);
                      return (
                        <td key={r.id} style={{padding:8}}>
                          <input 
                            type="number" 
                            className="form-control" 
                            style={{textAlign:'right', fontSize:'0.9rem', padding:'6px', borderColor: mov ? '#3b82f6' : '#e2e8f0'}}
                            placeholder="0.00"
                            defaultValue={mov?.valor || ''}
                            onBlur={(e) => handleSalvarMovimento(func.id, r.id, e.target.value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 2: ANÁLISE */}
      {activeTab === 'analise' && (
        <div className="fade-in" style={{display:'flex', gap:20}}>
          <div style={{width:'300px', background:'white', borderRadius:8, border:'1px solid #e2e8f0', height:'calc(100vh - 200px)', overflowY:'auto'}}>
            {funcionarios?.map(f => (
              <div 
                key={f.id} 
                onClick={() => carregarAnaliseIndividual(f.id)}
                style={{padding:15, borderBottom:'1px solid #f1f5f9', cursor:'pointer', background: funcionarioAnalise===f.id ? '#eff6ff' : 'white'}}
              >
                <strong>{f.nome_completo}</strong>
                <div style={{fontSize:'0.8rem', color:'#64748b'}}>{f.cargo}</div>
              </div>
            ))}
          </div>

          <div style={{flex:1}}>
            {folhaAnalise ? (
              <div className="holerite-card" style={{background:'white', padding:30, borderRadius:12, border:'1px solid #e2e8f0'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}>
                  <h2 style={{margin:0}}>Holerite Simulado</h2>
                  <span style={{background:'#e0f2fe', color:'#0369a1', padding:'4px 12px', borderRadius:20, fontSize:'0.9rem'}}>Competência: {mes}/{ano}</span>
                </div>
                <table style={{width:'100%', marginBottom:20}}>
                  <thead style={{borderBottom:'2px solid #f1f5f9'}}>
                    <tr>
                      <th style={{textAlign:'left', padding:10}}>Evento</th>
                      <th style={{textAlign:'right', padding:10}}>Proventos</th>
                      <th style={{textAlign:'right', padding:10}}>Descontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folhaAnalise.folha_itens?.map(item => (
                      <tr key={item.id} style={{borderBottom:'1px dashed #f1f5f9'}}>
                        <td style={{padding:10}}>{item.descricao}</td>
                        <td style={{textAlign:'right', padding:10, color:'#16a34a'}}>{item.tipo==='Provento' ? item.valor.toFixed(2) : ''}</td>
                        <td style={{textAlign:'right', padding:10, color:'#dc2626'}}>{item.tipo==='Desconto' ? item.valor.toFixed(2) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{background:'#f8fafc', fontWeight:'bold'}}>
                      <td style={{padding:15}}>LÍQUIDO A RECEBER</td>
                      <td colSpan={2} style={{textAlign:'right', padding:15, fontSize:'1.2rem', color:'#0f172a'}}>
                        R$ {folhaAnalise.liquido_receber.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{padding:60, textAlign:'center', color:'#94a3b8', border:'2px dashed #e2e8f0', borderRadius:12}}>
                Selecione um funcionário ao lado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: RUBRICAS */}
      {activeTab === 'rubricas' && (
        <div className="fade-in">
          <div style={{background:'white', padding:20, borderRadius:12, border:'1px solid #e2e8f0', marginBottom:20}}>
            <h4>Nova Rubrica</h4>
            <div style={{display:'flex', gap:10, marginTop:10}}>
              <input placeholder="Cód (Ex: 200)" className="form-control" style={{width:100}} value={novaRubrica.codigo} onChange={e=>setNovaRubrica({...novaRubrica, codigo:e.target.value})} />
              <input placeholder="Nome (Ex: Bônus)" className="form-control" style={{flex:1}} value={novaRubrica.nome} onChange={e=>setNovaRubrica({...novaRubrica, nome:e.target.value})} />
              <select className="form-control" value={novaRubrica.tipo} onChange={e=>setNovaRubrica({...novaRubrica, tipo:e.target.value})}>
                <option value="Provento">Provento</option>
                <option value="Desconto">Desconto</option>
              </select>
              <button className="btn-primary" onClick={handleCriarRubrica}>Adicionar</button>
            </div>
          </div>
          <div className="grid-rubricas" style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:15}}>
            {rubricas?.map(r => (
              <div key={r.id} style={{background:'white', padding:15, borderRadius:8, border:'1px solid #e2e8f0'}}>
                <strong>{r.codigo} - {r.nome}</strong>
                <div style={{fontSize:'0.8rem', color: r.tipo==='Provento'?'green':'red'}}>{r.tipo}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}