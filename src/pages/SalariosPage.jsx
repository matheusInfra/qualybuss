import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { getBeneficiosEmLote } from '../services/beneficioService';
import { calcularSalarioLiquido } from '../utils/calculadoraSalario';
import { toast } from 'react-hot-toast';
import GestaoBeneficios from '../components/Ausencias/GestaoBeneficios';
import MuralApontamentos from '../components/Folha/MuralApontamentos';
import './SalariosPage.css';

function SalariosPage() {
  const [activeTab, setActiveTab] = useState('folha'); 
  const [empresaId, setEmpresaId] = useState('');
  
  // -- Estados da Aba Visão Geral --
  const [filtros, setFiltros] = useState({ empresa: '', departamento: '', search: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [folhaData, setFolhaData] = useState([]);
  const [resumoGeral, setResumoGeral] = useState({ bruto: 0, liquido: 0, custo: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [detalheExpandido, setDetalheExpandido] = useState(null);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);

  const { data: empresas } = useSWR('getEmpresas', getEmpresas, {
    onSuccess: (data) => { if(data?.length > 0 && !empresaId) setEmpresaId(data[0].id); }
  });
  
  const departamentos = ["Administrativo", "Financeiro", "Comercial", "TI", "Operacional", "RH", "Logística", "Diretoria"];

  // Função para formatar moeda
  const fmt = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);

  // Busca e calcula os dados
  const fetchDadosGerais = useCallback(async () => {
    if(activeTab !== 'folha') return;
    
    setLoading(true);
    try {
      // 1. Busca Funcionários
      const res = await getFuncionarios({
        page, limit: 10, search: filtros.search,
        empresaId: filtros.empresa || null, departamento: filtros.departamento || null, status: 'Ativo'
      });

      // 2. Busca Benefícios em lote
      const ids = res.data.map(f => f.id);
      const bens = await getBeneficiosEmLote(ids);
      const map = {};
      bens.forEach(b => { if(!map[b.funcionario_id]) map[b.funcionario_id]=[]; map[b.funcionario_id].push(b); });

      // 3. Executa a Calculadora
      const calc = res.data.map(f => {
        const c = calcularSalarioLiquido(Number(f.salario_bruto), f.qtd_dependentes, map[f.id]||[]);
        return { ...f, calculo: c, beneficios: c.listaBeneficios || [] };
      });

      setFolhaData(calc);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);

      // 4. Calcula Totais dos Cards (Soma da página atual)
      const totais = calc.reduce((acc, curr) => ({
        bruto: acc.bruto + curr.calculo.salarioBruto,
        liquido: acc.liquido + curr.calculo.salarioLiquido,
        custo: acc.custo + curr.calculo.custoEmpresa
      }), { bruto: 0, liquido: 0, custo: 0 });
      
      setResumoGeral(totais);

    } catch(e) { console.error(e); toast.error("Erro ao carregar dados."); } 
    finally { setLoading(false); }
  }, [page, filtros, activeTab]);

  useEffect(() => { fetchDadosGerais(); }, [fetchDadosGerais]);

  const handleFiltrar = (e) => { e.preventDefault(); setPage(1); fetchDadosGerais(); };
  const handleLimpar = () => { setFiltros({ empresa: '', departamento: '', search: '' }); setPage(1); setTimeout(fetchDadosGerais, 50); };
  
  const handleGestao = (func) => { setSelectedFuncionario(func); setActiveTab('beneficios'); };

  // Helper para renderizar valor do benefício corretamente (% ou R$)
  const renderValorBeneficio = (beneficio) => {
    if (beneficio.tipo_valor === 'Porcentagem') {
      return (
        <span className="valor-composto">
          <small>{beneficio.valor}%</small> 
          <strong>{fmt(beneficio.valorCalculado)}</strong>
        </span>
      );
    }
    return <strong>{fmt(beneficio.valor)}</strong>;
  };

  return (
    <div className="salarios-container fade-in">
      <header className="page-header-salarios">
        <div className="header-left">
          <h1>Central de Folha</h1>
          <p>Gestão contratual, benefícios e fechamento mensal.</p>
        </div>
        
        {/* CARDS DE RESUMO (Topo da Página) */}
        {activeTab === 'folha' && (
          <div className="resumo-cards-top">
            <div className="card-resumo">
              <span className="card-label">Total Bruto</span>
              <strong className="card-value">{fmt(resumoGeral.bruto)}</strong>
            </div>
            <div className="card-resumo highlight-green">
              <span className="card-label">Total Líquido</span>
              <strong className="card-value text-green">{fmt(resumoGeral.liquido)}</strong>
            </div>
            <div className="card-resumo highlight-blue">
              <span className="card-label">Custo Empresa</span>
              <strong className="card-value text-blue">{fmt(resumoGeral.custo)}</strong>
            </div>
          </div>
        )}

        <div className="empresa-selector-header">
          <span className="material-symbols-outlined">domain</span>
          <select value={empresaId} onChange={e=>setEmpresaId(e.target.value)}>
            <option value="">Todas as Empresas</option>
            {empresas?.map(e=><option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
          </select>
        </div>
      </header>

      {/* Navegação de Abas */}
      <div className="tabs-header-modern">
        <button className={`tab-item ${activeTab==='folha'?'active':''}`} onClick={()=>setActiveTab('folha')}>
          <span className="material-symbols-outlined">table_view</span> Visão Contratual
        </button>
        <button className={`tab-item ${activeTab==='fechamento'?'active':''}`} onClick={()=>setActiveTab('fechamento')}>
          <span className="material-symbols-outlined">edit_calendar</span> Mural de Fechamento
        </button>
        <button className={`tab-item ${activeTab==='beneficios'?'active':''}`} disabled={!selectedFuncionario} onClick={()=>setActiveTab('beneficios')}>
          <span className="material-symbols-outlined">settings_account_box</span> {selectedFuncionario ? 'Gerir: '+selectedFuncionario.nome_completo : 'Gestão Individual'}
        </button>
      </div>

      {/* --- ABA 1: VISÃO GERAL (TABELA) --- */}
      {activeTab === 'folha' && (
        <div className="tab-body fade-in">
          {/* Barra de Filtros */}
          <div className="filtros-bar">
            <form onSubmit={handleFiltrar} className="filtros-grid">
              <div className="form-group">
                <label>Buscar Colaborador</label>
                <div className="input-icon">
                  <span className="material-symbols-outlined">search</span>
                  <input value={filtros.search} onChange={e=>setFiltros({...filtros,search:e.target.value})} placeholder="Nome, Cargo..." />
                </div>
              </div>
              <div className="form-group">
                <label>Empresa</label>
                <select value={filtros.empresa} onChange={e=>setFiltros({...filtros,empresa:e.target.value})}>
                  <option value="">Todas</option>
                  {empresas?.map(e=><option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Departamento</label>
                <select value={filtros.departamento} onChange={e=>setFiltros({...filtros,departamento:e.target.value})}>
                  <option value="">Todos</option>
                  {departamentos.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="filtros-actions">
                <button type="button" className="btn-secondary" onClick={handleLimpar}>Limpar</button>
                <button type="submit" className="btn-primary">Filtrar</button>
              </div>
            </form>
          </div>

          {/* Tabela de Dados */}
          <div className="tabela-container">
            {loading ? <div className="loading-state"><div className="spinner-simple"></div>Calculando...</div> : (
              <>
                <table className="tabela-salarios">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Salário Base</th>
                      <th className="text-red">Desc. Oficiais</th>
                      <th className="text-red">Benefícios (-)</th>
                      <th className="text-green">Líquido Est.</th>
                      <th>Custo Empresa</th>
                      <th width="50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {folhaData.length === 0 && <tr><td colSpan="7" className="empty-state">Nenhum colaborador encontrado com os filtros atuais.</td></tr>}
                    {folhaData.map(i => (
                      <React.Fragment key={i.id}>
                        <tr onClick={()=>setDetalheExpandido(detalheExpandido===i.id?null:i.id)} className={`linha-principal ${detalheExpandido===i.id?'active':''}`}>
                          <td>
                            <div className="colaborador-info">
                              <div className="avatar-circle">{i.nome_completo.charAt(0)}</div>
                              <div><span className="nome">{i.nome_completo}</span><span className="cargo-mini">{i.cargo} • {i.departamento}</span></div>
                            </div>
                          </td>
                          <td className="font-medium">{fmt(i.calculo.salarioBruto)}</td>
                          <td className="text-red">- {fmt(i.calculo.inss + i.calculo.irrf)}</td>
                          <td className="text-red font-bold">
                            {i.calculo.totalDescontosExtras > 0 ? `- ${fmt(i.calculo.totalDescontosExtras)}` : '--'}
                          </td>
                          <td className="text-green font-bold cell-liquido">{fmt(i.calculo.salarioLiquido)}</td>
                          <td className="text-secondary font-medium">{fmt(i.calculo.custoEmpresa)}</td>
                          <td onClick={(e)=>e.stopPropagation()}>
                            <button className="btn-icon-action" onClick={()=>handleGestao(i)} title="Cadastrar Benefícios/Descontos">
                              <span className="material-symbols-outlined">edit_document</span>
                            </button>
                          </td>
                        </tr>
                        
                        {/* CARD EXPANDIDO - DETALHES COMPLETOS */}
                        {detalheExpandido === i.id && (
                          <tr className="linha-detalhes fade-in">
                            <td colSpan="7">
                              <div className="detalhes-wrapper">
                                <div className="detalhes-grid">
                                  
                                  {/* Visão COLABORADOR */}
                                  <div className="bloco-detalhe card-colaborador">
                                    <div className="bloco-header">
                                      <span className="material-symbols-outlined">person</span>
                                      <h4>Visão do Colaborador (Recebimento)</h4>
                                    </div>
                                    
                                    <div className="detalhe-row"><span>Salário Contratual:</span> <strong>{fmt(i.calculo.salarioBruto)}</strong></div>
                                    
                                    {/* Proventos Extras */}
                                    {i.beneficios.filter(b=>b.tipo==='Provento').map(b=>(
                                      <div key={b.id} className="detalhe-row text-green">
                                        <span>(+) {b.nome}</span> {renderValorBeneficio(b)}
                                      </div>
                                    ))}

                                    <div className="divider-dashed"></div>

                                    {/* Descontos Oficiais */}
                                    <div className="detalhe-row text-red"><span>(-) INSS (Progressivo):</span> <span>{fmt(i.calculo.inss)}</span></div>
                                    <div className="detalhe-row text-red"><span>(-) IRRF (Retido):</span> <span>{fmt(i.calculo.irrf)}</span></div>
                                    
                                    {/* Descontos Benefícios */}
                                    {i.beneficios.filter(b=>b.tipo==='Desconto').map(b=>(
                                      <div key={b.id} className="detalhe-row text-red-dark">
                                        <span>(-) {b.nome}</span> {renderValorBeneficio(b)}
                                      </div>
                                    ))}
                                    
                                    <div className="detalhe-row total-row">
                                      <span>Líquido a Receber:</span>
                                      <span className="text-green text-xl">{fmt(i.calculo.salarioLiquido)}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Visão EMPREGADOR (Calculadora Patronal) */}
                                  <div className="bloco-detalhe card-empregador">
                                    <div className="bloco-header">
                                      <span className="material-symbols-outlined">domain</span>
                                      <h4>Visão do Empregador (Custo Total)</h4>
                                    </div>

                                    <div className="detalhe-row"><span>Salário Base:</span><span>{fmt(i.calculo.salarioBruto)}</span></div>
                                    
                                    {/* Usando os detalhes do objeto custosDetalhados da calculadora */}
                                    {i.calculo.custosDetalhados.beneficios > 0 && (
                                      <div className="detalhe-row"><span>(+) Benefícios Pagos:</span><span>{fmt(i.calculo.custosDetalhados.beneficios)}</span></div>
                                    )}
                                    
                                    <div className="detalhe-row"><span>(+) FGTS (8%):</span><span>{fmt(i.calculo.custosDetalhados.fgts)}</span></div>
                                    <div className="detalhe-row"><span>(+) INSS Patronal (20%):</span><span>{fmt(i.calculo.custosDetalhados.patronal)}</span></div>
                                    <div className="detalhe-row"><span>(+) RAT/Terceiros (5.8%):</span><span>{fmt(i.calculo.custosDetalhados.rat_terceiros)}</span></div>
                                    <div className="detalhe-row"><span>(+) Prov. Férias/13º (11.11%):</span><span>{fmt(i.calculo.custosDetalhados.provisionamento)}</span></div>
                                    
                                    <div className="detalhe-row total-row">
                                      <span>Custo Total Mensal:</span>
                                      <span className="text-blue text-xl">{fmt(i.calculo.custoEmpresa)}</span>
                                    </div>
                                    <div className="info-extra">
                                      <small>*Cálculo inclui provisões e encargos de Regime Normal.</small>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                <div className="paginacao-container">
                  <span>Página {page} de {totalPages || 1}</span>
                  <div className="paginacao-btns">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button>
                    <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Próxima</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- ABA 2: MURAL FECHAMENTO --- */}
      {activeTab === 'fechamento' && (
        <MuralApontamentos empresaId={filtros.empresa || empresas?.[0]?.id} />
      )}

      {/* --- ABA 3: GESTÃO BENEFÍCIOS --- */}
      {activeTab === 'beneficios' && selectedFuncionario && (
        <div className="gestao-wrapper">
          <button className="btn-back" onClick={()=>setActiveTab('folha')}>← Voltar para Lista</button>
          <GestaoBeneficios 
            funcionario={selectedFuncionario} 
            beneficios={folhaData.find(f=>f.id===selectedFuncionario.id)?.beneficios||[]} 
            onUpdate={fetchDadosGerais} 
          />
        </div>
      )}
    </div>
  );
}

export default SalariosPage;