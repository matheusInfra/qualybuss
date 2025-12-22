import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { getBeneficiosEmLote } from '../services/beneficioService';
import { calcularSalarioLiquido } from '../utils/calculadoraSalario';
import { toast } from 'react-hot-toast';

// Componentes Internos
import GestaoBeneficios from '../components/Ausencias/GestaoBeneficios';
import MuralApontamentos from '../components/Folha/MuralApontamentos';
import CatalogoBeneficios from '../components/Folha/CatalogoBeneficios';

import './SalariosPage.css';

function SalariosPage() {
  const [activeTab, setActiveTab] = useState('folha'); 
  const [empresaId, setEmpresaId] = useState('');
  
  // -- Estados Visão Geral --
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

  // --- BUSCA DE DADOS ---
  const fetchDadosGerais = useCallback(async () => {
    if (activeTab !== 'folha') return;
    
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
        // Calcula e garante que a lista de benefícios esteja acessível no objeto principal
        const c = calcularSalarioLiquido(Number(f.salario_bruto), f.qtd_dependentes, map[f.id]||[]);
        return { 
          ...f, 
          calculo: c, 
          beneficios: c.listaBeneficios || [] // Atalho direto para uso no JSX
        };
      });

      setFolhaData(calc);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);

      const totais = calc.reduce((acc, curr) => ({
        bruto: acc.bruto + curr.calculo.salarioBruto,
        liquido: acc.liquido + curr.calculo.salarioLiquido,
        custo: acc.custo + curr.calculo.custoEmpresa
      }), { bruto: 0, liquido: 0, custo: 0 });
      
      setResumoGeral(totais);

    } catch (e) {
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

  // --- FUNÇÃO DE RENDERIZAÇÃO (CORRIGIDA) ---
  // Esta função deve estar DENTRO do componente, antes do return
  const renderBeneficioValue = (ben) => {
    const valorReal = ben.valorCalculado || ben.valor || 0;
    
    if (ben.tipo_valor === 'Porcentagem') {
      return (
        <div className="valor-composto">
          <span className="badge-pct">{ben.valor}%</span>
          <span className="valor-real">{fmt(valorReal)}</span>
        </div>
      );
    }
    return <span className="valor-real">{fmt(valorReal)}</span>;
  };

  return (
    <div className="salarios-container fade-in">
      <header className="page-header-salarios">
        <div className="header-left">
          <h1>Central de Folha</h1>
          <p>Visão completa: Do bruto ao líquido e custo empresa.</p>
        </div>
        
        {activeTab === 'folha' && (
          <div className="resumo-cards-top">
            <div className="card-resumo">
              <span className="label">Total Bruto</span>
              <strong className="value">{fmt(resumoGeral.bruto)}</strong>
            </div>
            <div className="card-resumo highlight-green">
              <span className="label">Total Líquido</span>
              <strong className="value text-green">{fmt(resumoGeral.liquido)}</strong>
            </div>
            <div className="card-resumo highlight-blue">
              <span className="label">Custo Empresa</span>
              <strong className="value text-blue">{fmt(resumoGeral.custo)}</strong>
            </div>
          </div>
        )}

        <div className="empresa-selector">
          <span className="material-symbols-outlined">domain</span>
          <select value={empresaId} onChange={e=>setEmpresaId(e.target.value)}>
            <option value="">Todas as Empresas</option>
            {empresas?.map(e=><option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
          </select>
        </div>
      </header>

      <div className="tabs-bar">
        <button className={`tab-btn ${activeTab==='folha'?'active':''}`} onClick={()=>setActiveTab('folha')}>
          <span className="material-symbols-outlined">table_view</span> Visão Contratual
        </button>
        <button className={`tab-btn ${activeTab==='fechamento'?'active':''}`} onClick={()=>setActiveTab('fechamento')}>
          <span className="material-symbols-outlined">edit_calendar</span> Mural de Fechamento
        </button>
        <button className={`tab-btn ${activeTab==='catalogo'?'active':''}`} onClick={()=>setActiveTab('catalogo')}>
          <span className="material-symbols-outlined">library_books</span> Catálogo Benefícios
        </button>
        <button className={`tab-btn ${activeTab==='beneficios'?'active':''}`} disabled={!selectedFuncionario} onClick={()=>setActiveTab('beneficios')}>
          <span className="material-symbols-outlined">person</span> {selectedFuncionario ? 'Individual: '+selectedFuncionario.nome_completo : 'Selecione na Tabela'}
        </button>
      </div>

      {activeTab === 'folha' && (
        <div className="tab-content fade-in">
          <div className="filtros-wrapper">
            <form onSubmit={handleFiltrar} className="filtros-form">
              <div className="form-group"><label>Buscar</label><input value={filtros.search} onChange={e=>setFiltros({...filtros,search:e.target.value})} placeholder="Colaborador..." /></div>
              <div className="form-group"><label>Empresa</label><select value={filtros.empresa} onChange={e=>setFiltros({...filtros,empresa:e.target.value})}><option value="">Todas</option>{empresas?.map(e=><option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}</select></div>
              <div className="form-group"><label>Departamento</label><select value={filtros.departamento} onChange={e=>setFiltros({...filtros,departamento:e.target.value})}><option value="">Todos</option>{departamentos.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
              <div className="actions-group"><button type="button" className="btn-secondary" onClick={handleLimpar}>Limpar</button><button type="submit" className="btn-primary">Filtrar</button></div>
            </form>
          </div>

          <div className="tabela-container">
            {loading ? <div className="loading-state"><div className="spinner"></div><p>Calculando...</p></div> : (
              <>
                <table className="tabela-salarios">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Salário Base</th>
                      <th className="text-red">Impostos</th>
                      <th className="text-red">Benef. (-)</th>
                      <th className="text-green">Líquido</th>
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
                            <button className="btn-icon" onClick={()=>handleGestao(i)} title="Editar Benefícios">
                              <span className="material-symbols-outlined">edit_document</span>
                            </button>
                          </td>
                        </tr>
                        
                        {/* --- DETALHES COMPLETOS (Onde ocorria o erro) --- */}
                        {detalheExpandido === i.id && (
                          <tr className="linha-detalhes fade-in">
                            <td colSpan="7">
                              <div className="detalhes-wrapper">
                                <div className="detalhes-grid">
                                  
                                  {/* Card Esquerda: Colaborador */}
                                  <div className="card-detalhe card-colaborador">
                                    <div className="card-header">
                                      <span className="material-symbols-outlined">person</span>
                                      <h4>Demonstrativo Colaborador</h4>
                                    </div>
                                    
                                    <div className="row"><span>(+) Salário Contratual:</span> <strong>{fmt(i.calculo.salarioBruto)}</strong></div>
                                    
                                    {/* Proventos Extras */}
                                    {i.beneficios.filter(b=>b.tipo==='Provento').map(b=>(
                                      <div key={b.id} className="row text-green">
                                        <span>(+) {b.nome}</span> {renderBeneficioValue(b)}
                                      </div>
                                    ))}

                                    <div className="divider-dashed"></div>

                                    {/* Descontos Oficiais */}
                                    <div className="row text-red"><span>(-) INSS (Oficial):</span> <span>{fmt(i.calculo.inss)}</span></div>
                                    <div className="row text-red"><span>(-) IRRF (Retido):</span> <span>{fmt(i.calculo.irrf)}</span></div>
                                    
                                    {/* Descontos Benefícios */}
                                    {i.beneficios.filter(b=>b.tipo==='Desconto').map(b=>(
                                      <div key={b.id} className="row text-red-dark">
                                        <span>(-) {b.nome}</span> {renderBeneficioValue(b)}
                                      </div>
                                    ))}

                                    <div className="row total-row">
                                      <span>= Líquido a Receber:</span>
                                      <span className="big-green">{fmt(i.calculo.salarioLiquido)}</span>
                                    </div>
                                  </div>

                                  {/* Card Direita: Empregador (Com Detalhamento Completo) */}
                                  <div className="card-detalhe card-empregador">
                                    <div className="card-header">
                                      <span className="material-symbols-outlined">domain</span>
                                      <h4>Visão do Empregador (Custo Total)</h4>
                                    </div>

                                    <div className="row"><span>(+) Salário Base:</span> <span>{fmt(i.calculo.salarioBruto)}</span></div>
                                    
                                    {/* Detalhes do Custo Empresa (Vindos da Calculadora) */}
                                    {i.calculo.custosDetalhados?.beneficios > 0 && (
                                      <div className="row"><span>(+) Benefícios (Pago Empresa):</span> <span>{fmt(i.calculo.custosDetalhados.beneficios)}</span></div>
                                    )}
                                    
                                    <div className="row"><span>(+) FGTS (8%):</span> <span>{fmt(i.calculo.custosDetalhados?.fgts)}</span></div>
                                    <div className="row"><span>(+) INSS Patronal (20%):</span> <span>{fmt(i.calculo.custosDetalhados?.patronal)}</span></div>
                                    <div className="row"><span>(+) RAT / Sistema S (5.8%):</span> <span>{fmt(i.calculo.custosDetalhados?.rat_terceiros)}</span></div>
                                    <div className="row"><span>(+) Provisão Férias/13º (11.11%):</span> <span>{fmt(i.calculo.custosDetalhados?.provisionamento)}</span></div>

                                    <div className="row total-row">
                                      <span>= Custo Total Mensal:</span>
                                      <span className="big-blue">{fmt(i.calculo.custoEmpresa)}</span>
                                    </div>
                                    <div className="info-extra">
                                      *Inclui provisões futuras e encargos sociais estimados (Regime Normal).
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
                
                <div className="pagination">
                  <span>Página {page} de {totalPages || 1}</span>
                  <div className="page-btns">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button>
                    <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Próxima</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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