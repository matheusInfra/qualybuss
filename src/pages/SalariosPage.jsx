import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { getBeneficiosEmLote } from '../services/beneficioService';
import { calcularSalarioLiquido } from '../utils/calculadoraSalario';
import { toast } from 'react-hot-toast';

// Componentes da Pasta Folha/Ausencias
import GestaoBeneficios from '../components/Ausencias/GestaoBeneficios';
import MuralApontamentos from '../components/Folha/MuralApontamentos';
import CatalogoBeneficios from '../components/Folha/CatalogoBeneficios';

import './SalariosPage.css';

function SalariosPage() {
  const [activeTab, setActiveTab] = useState('folha'); // 'folha', 'fechamento', 'catalogo', 'beneficios'
  const [empresaId, setEmpresaId] = useState('');
  
  // -- Visão Geral --
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
  const fmt = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);

  // --- BUSCA E CÁLCULO ---
  const fetchDadosGerais = useCallback(async () => {
    // Só carrega se estiver na aba relevante
    if(activeTab !== 'folha') return;
    
    setLoading(true);
    try {
      const res = await getFuncionarios({
        page, limit: 10, search: filtros.search,
        empresaId: filtros.empresa || null, departamento: filtros.departamento || null, status: 'Ativo'
      });

      const ids = res.data.map(f => f.id);
      const bens = await getBeneficiosEmLote(ids);
      const map = {};
      bens.forEach(b => { if(!map[b.funcionario_id]) map[b.funcionario_id]=[]; map[b.funcionario_id].push(b); });

      const calc = res.data.map(f => {
        // Calcula usando os dados atuais do contrato
        const c = calcularSalarioLiquido(Number(f.salario_bruto), f.qtd_dependentes, map[f.id]||[]);
        return { ...f, calculo: c };
      });

      setFolhaData(calc);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);

      // Totais dos Cards de Resumo (Topo)
      const totais = calc.reduce((acc, curr) => ({
        bruto: acc.bruto + curr.calculo.salarioBruto,
        liquido: acc.liquido + curr.calculo.salarioLiquido,
        custo: acc.custo + curr.calculo.custoEmpresa
      }), { bruto: 0, liquido: 0, custo: 0 });
      
      setResumoGeral(totais);

    } catch(e) { 
      console.error(e); 
      toast.error("Erro ao carregar dados.");
    } finally { 
      setLoading(false); 
    }
  }, [page, filtros, activeTab]);

  useEffect(() => { fetchDadosGerais(); }, [fetchDadosGerais]);

  const handleFiltrar = (e) => { e.preventDefault(); setPage(1); fetchDadosGerais(); };
  const handleLimpar = () => { setFiltros({ empresa: '', departamento: '', search: '' }); setPage(1); setTimeout(fetchDadosGerais, 50); };
  const handleGestao = (func) => { setSelectedFuncionario(func); setActiveTab('beneficios'); };

  // --- HELPER DE RENDERIZAÇÃO (DENTRO DO COMPONENTE) ---
  const renderBeneficioValue = (ben) => {
    // Valor calculado vem da calculadora (tratando %)
    const valorExibido = ben.valorCalculado || ben.valor || 0;
    
    if (ben.tipo_valor === 'Porcentagem') {
      return (
        <div className="valor-composto">
          <span className="badge-pct">{ben.valor}%</span>
          <span className="valor-real">{fmt(valorExibido)}</span>
        </div>
      );
    }
    return <span className="valor-real">{fmt(valorExibido)}</span>;
  };

  return (
    <div className="salarios-container fade-in">
      <header className="page-header-salarios">
        <div className="header-left">
          <h1>Central de Folha</h1>
          <p>Visão contratual, benefícios e fechamento mensal.</p>
        </div>
        
        {/* Cards de Resumo (Visíveis na aba Folha) */}
        {activeTab === 'folha' && (
          <div className="resumo-cards-top">
            <div className="card-resumo">
              <span className="label">Total Bruto (Pág)</span>
              <strong className="value">{fmt(resumoGeral.bruto)}</strong>
            </div>
            <div className="card-resumo highlight-green">
              <span className="label">Total Líquido (Pág)</span>
              <strong className="value text-green">{fmt(resumoGeral.liquido)}</strong>
            </div>
            <div className="card-resumo highlight-blue">
              <span className="label">Custo Empresa (Est.)</span>
              <strong className="value text-blue">{fmt(resumoGeral.custo)}</strong>
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

      {/* Navegação */}
      <div className="tabs-header-modern">
        <button className={`tab-item ${activeTab==='folha'?'active':''}`} onClick={()=>setActiveTab('folha')}>
          <span className="material-symbols-outlined">table_view</span> Visão Contratual
        </button>
        <button className={`tab-item ${activeTab==='fechamento'?'active':''}`} onClick={()=>setActiveTab('fechamento')}>
          <span className="material-symbols-outlined">edit_calendar</span> Mural de Fechamento
        </button>
        <button className={`tab-item ${activeTab==='catalogo'?'active':''}`} onClick={()=>setActiveTab('catalogo')}>
          <span className="material-symbols-outlined">library_books</span> Catálogo Benefícios
        </button>
        <button className={`tab-item ${activeTab==='beneficios'?'active':''}`} disabled={!selectedFuncionario} onClick={()=>setActiveTab('beneficios')}>
          <span className="material-symbols-outlined">person</span> {selectedFuncionario ? 'Individual: '+selectedFuncionario.nome_completo : 'Selecione na Tabela'}
        </button>
      </div>

      {/* --- ABA 1: TABELA GERAL --- */}
      {activeTab === 'folha' && (
        <div className="tab-body fade-in">
          {/* Filtros */}
          <div className="filtros-bar">
            <form onSubmit={handleFiltrar} className="filtros-grid">
              <div className="form-group"><label>Buscar</label><div className="input-icon"><span className="material-symbols-outlined">search</span><input value={filtros.search} onChange={e=>setFiltros({...filtros,search:e.target.value})} placeholder="Nome, Cargo..." /></div></div>
              <div className="form-group"><label>Empresa</label><select value={filtros.empresa} onChange={e=>setFiltros({...filtros,empresa:e.target.value})}><option value="">Todas</option>{empresas?.map(e=><option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}</select></div>
              <div className="form-group"><label>Departamento</label><select value={filtros.departamento} onChange={e=>setFiltros({...filtros,departamento:e.target.value})}><option value="">Todos</option>{departamentos.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
              <div className="filtros-actions"><button type="button" className="btn-secondary" onClick={handleLimpar}>Limpar</button><button type="submit" className="btn-primary">Filtrar</button></div>
            </form>
          </div>

          <div className="tabela-container">
            {loading ? <div className="loading-state"><div className="spinner-simple"></div>Calculando...</div> : (
              <>
                <table className="tabela-salarios">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Salário Base</th>
                      <th className="text-red">Impostos</th>
                      <th className="text-red">Benefícios (-)</th>
                      <th className="text-green">Líquido Est.</th>
                      <th>Custo Empresa</th>
                      <th width="50"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {folhaData.length === 0 && <tr><td colSpan="7" className="empty-state">Nenhum dado encontrado.</td></tr>}
                    {folhaData.map(i => (
                      <React.Fragment key={i.id}>
                        <tr onClick={()=>setDetalheExpandido(detalheExpandido===i.id?null:i.id)} className={`linha-principal ${detalheExpandido===i.id?'active':''}`}>
                          <td>
                            <div className="colaborador-info">
                              <div className="avatar-circle">{i.nome_completo.charAt(0)}</div>
                              <div><span className="nome">{i.nome_completo}</span><span className="cargo-mini">{i.cargo}</span></div>
                            </div>
                          </td>
                          <td className="font-medium">{fmt(i.calculo.salarioBruto)}</td>
                          <td className="text-red">- {fmt(i.calculo.inss + i.calculo.irrf)}</td>
                          <td className="text-red font-bold">
                            {i.calculo.totalDescontosExtras > 0 ? `- ${fmt(i.calculo.totalDescontosExtras)}` : '--'}
                          </td>
                          <td className="text-green font-bold cell-liquido">{fmt(i.calculo.salarioLiquido)}</td>
                          <td className="text-secondary">{fmt(i.calculo.custoEmpresa)}</td>
                          <td onClick={e=>e.stopPropagation()}>
                            <button className="btn-icon-action" onClick={()=>handleGestao(i)} title="Editar Benefícios">
                              <span className="material-symbols-outlined">edit_document</span>
                            </button>
                          </td>
                        </tr>
                        
                        {/* --- CARD DETALHADO EXPANDIDO --- */}
                        {detalheExpandido === i.id && (
                          <tr className="linha-detalhes fade-in">
                            <td colSpan="7">
                              <div className="detalhes-wrapper">
                                <div className="detalhes-grid">
                                  
                                  {/* ESQUERDA: DO BRUTO AO LÍQUIDO (Visão Colaborador) */}
                                  <div className="bloco-detalhe card-colaborador">
                                    <div className="bloco-header">
                                      <span className="material-symbols-outlined">person</span>
                                      <h4>Demonstrativo Colaborador</h4>
                                    </div>
                                    
                                    <div className="detalhe-row"><span>(+) Salário Contratual:</span> <strong>{fmt(i.calculo.salarioBruto)}</strong></div>
                                    
                                    {/* Proventos Extras */}
                                    {i.calculo.listaBeneficios.filter(b=>b.tipo==='Provento').map(b=>(
                                      <div key={b.id} className="detalhe-row text-green">
                                        <span>(+) {b.nome}</span> {renderBeneficioValue(b)}
                                      </div>
                                    ))}

                                    <div className="divider-dashed"></div>

                                    {/* Descontos */}
                                    <div className="detalhe-row text-red"><span>(-) INSS (Oficial):</span> <span>{fmt(i.calculo.inss)}</span></div>
                                    <div className="detalhe-row text-red"><span>(-) IRRF (Retido):</span> <span>{fmt(i.calculo.irrf)}</span></div>
                                    
                                    {/* Benefícios de Desconto */}
                                    {i.calculo.listaBeneficios.filter(b=>b.tipo==='Desconto').map(b=>(
                                      <div key={b.id} className="detalhe-row text-red-dark">
                                        <span>(-) {b.nome}</span> {renderBeneficioValue(b)}
                                      </div>
                                    ))}

                                    <div className="detalhe-row total-row">
                                      <span>= Líquido a Receber:</span>
                                      <span className="big-green">{fmt(i.calculo.salarioLiquido)}</span>
                                    </div>
                                  </div>

                                  {/* DIREITA: CUSTO REAL (Visão Empregador) */}
                                  <div className="bloco-detalhe empresa-bg card-empregador">
                                    <div className="bloco-header">
                                      <span className="material-symbols-outlined">domain</span>
                                      <h4>Visão do Empregador (Custo Total)</h4>
                                    </div>

                                    <div className="detalhe-row"><span>(+) Salário Base:</span> <span>{fmt(i.calculo.salarioBruto)}</span></div>
                                    
                                    {/* Itens detalhados do custo */}
                                    {i.calculo.custosDetalhados?.beneficios > 0 && (
                                      <div className="detalhe-row"><span>(+) Benefícios (Pagos):</span> <span>{fmt(i.calculo.custosDetalhados.beneficios)}</span></div>
                                    )}
                                    
                                    <div className="detalhe-row"><span>(+) FGTS (8%):</span> <span>{fmt(i.calculo.custosDetalhados?.fgts)}</span></div>
                                    <div className="detalhe-row"><span>(+) INSS Patronal (20%):</span> <span>{fmt(i.calculo.custosDetalhados?.patronal)}</span></div>
                                    <div className="detalhe-row"><span>(+) RAT/Sistema S (5.8%):</span> <span>{fmt(i.calculo.custosDetalhados?.rat_terceiros)}</span></div>
                                    <div className="detalhe-row"><span>(+) Provisão Férias/13º (11%):</span> <span>{fmt(i.calculo.custosDetalhados?.provisionamento)}</span></div>

                                    <div className="detalhe-row total-row">
                                      <span>= Custo Total Mensal:</span>
                                      <span className="big-blue">{fmt(i.calculo.custoEmpresa)}</span>
                                    </div>
                                    <div className="info-extra">
                                      <small>*Estimativa baseada em Regime Normal (Não Simples).</small>
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
                
                {/* Paginação */}
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

      {/* --- OUTRAS ABAS --- */}
      {activeTab === 'fechamento' && <MuralApontamentos empresaId={filtros.empresa || empresas?.[0]?.id} />}
      {activeTab === 'catalogo' && <CatalogoBeneficios empresaId={filtros.empresa || empresas?.[0]?.id} />}
      
      {activeTab === 'beneficios' && selectedFuncionario && (
        <div className="tab-content fade-in gestao-wrapper">
          <button className="btn-back" onClick={()=>setActiveTab('folha')}>← Voltar para Tabela</button>
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