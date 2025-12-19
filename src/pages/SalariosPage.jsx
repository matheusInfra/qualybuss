import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { getBeneficiosEmLote } from '../services/beneficioService';
import { calcularSalarioLiquido } from '../utils/calculadoraSalario';
import { toast } from 'react-hot-toast';
import GestaoBeneficios from '../components/Ausencias/GestaoBeneficios';
import './SalariosPage.css';

function SalariosPage() {
  // --- ESTADOS DE CONTROLE ---
  const [activeTab, setActiveTab] = useState('folha'); // 'folha' ou 'beneficios'
  const [filtros, setFiltros] = useState({ empresa: '', departamento: '', search: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DE DADOS ---
  const [folhaData, setFolhaData] = useState([]);
  const [beneficiosMap, setBeneficiosMap] = useState({}); // Cache de benefícios
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [detalheExpandido, setDetalheExpandido] = useState(null);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);

  const { data: empresas } = useSWR('getEmpresas', getEmpresas);
  // Lista de departamentos para filtro
  const departamentos = ["Administrativo", "Financeiro", "Comercial", "TI", "Operacional", "RH", "Logística", "Diretoria"];

  // --- BUSCA DE DADOS ---
  const fetchDados = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Busca Funcionários com Filtros e Paginação
      const res = await getFuncionarios({
        page,
        limit: 10,
        search: filtros.search,
        empresaId: filtros.empresa || null,
        departamento: filtros.departamento || null,
        status: 'Ativo'
      });

      // 2. Busca Benefícios em Lote (apenas para os IDs visíveis)
      const idsFuncionarios = res.data.map(f => f.id);
      const todosBeneficios = await getBeneficiosEmLote(idsFuncionarios);
      
      // Mapeia benefícios por funcionário
      const mapBeneficios = {};
      todosBeneficios.forEach(b => {
        if (!mapBeneficios[b.funcionario_id]) mapBeneficios[b.funcionario_id] = [];
        mapBeneficios[b.funcionario_id].push(b);
      });
      setBeneficiosMap(mapBeneficios);

      // 3. Calcula Salários (Bruto + Benefícios - Descontos)
      const dadosCalculados = res.data.map(func => {
        const beneficiosFunc = mapBeneficios[func.id] || [];
        const calculo = calcularSalarioLiquido(Number(func.salario_bruto) || 0, func.qtd_dependentes || 0, beneficiosFunc);
        return { ...func, calculo, beneficios: beneficiosFunc };
      });

      setFolhaData(dadosCalculados);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados da folha.");
    } finally {
      setLoading(false);
    }
  }, [page, filtros]);

  // Recarrega ao mudar página
  useEffect(() => { fetchDados(); }, [page]);

  // --- AÇÕES ---
  const handleFiltrar = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDados();
  };

  const handleLimpar = () => {
    setFiltros({ empresa: '', departamento: '', search: '' });
    setPage(1);
    setTimeout(() => fetchDados(), 50); // Garante update do estado
  };

  const handleOpenGestao = (funcionario) => {
    setSelectedFuncionario(funcionario);
    setActiveTab('beneficios');
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="salarios-container fade-in">
      <header className="page-header-salarios">
        <div>
          <h1>Gestão de Salários</h1>
          <p>Controle de folha, benefícios e custos.</p>
        </div>
        
        {/* Navegação de Abas */}
        <div className="tabs-header">
          <button 
            className={`tab-btn ${activeTab === 'folha' ? 'active' : ''}`} 
            onClick={() => setActiveTab('folha')}
          >
            <span className="material-symbols-outlined">table_view</span> Visão Geral
          </button>
          <button 
            className={`tab-btn ${activeTab === 'beneficios' ? 'active' : ''}`} 
            disabled={!selectedFuncionario && activeTab !== 'beneficios'}
            onClick={() => setActiveTab('beneficios')}
          >
            <span className="material-symbols-outlined">settings_account_box</span> 
            {selectedFuncionario ? `Gerir: ${selectedFuncionario.nome_completo}` : 'Gestão Individual'}
          </button>
        </div>
      </header>

      {/* --- ABA 1: TABELA GERAL --- */}
      {activeTab === 'folha' && (
        <>
          {/* Barra de Filtros */}
          <div className="filtros-bar">
            <form onSubmit={handleFiltrar} className="filtros-grid">
              <div className="form-group">
                <label>Buscar</label>
                <div className="input-icon">
                  <span className="material-symbols-outlined">search</span>
                  <input type="text" value={filtros.search} onChange={(e) => setFiltros({...filtros, search: e.target.value})} placeholder="Nome..." />
                </div>
              </div>
              <div className="form-group">
                <label>Empresa</label>
                <select value={filtros.empresa} onChange={(e) => setFiltros({...filtros, empresa: e.target.value})}>
                  <option value="">Todas</option>
                  {empresas?.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Departamento</label>
                <select value={filtros.departamento} onChange={(e) => setFiltros({...filtros, departamento: e.target.value})}>
                  <option value="">Todos</option>
                  {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="filtros-actions">
                <button type="button" className="btn-secondary" onClick={handleLimpar}>Limpar</button>
                <button type="submit" className="btn-primary">Filtrar</button>
              </div>
            </form>
          </div>

          <div className="tabela-container">
            {loading ? <div className="loading-state"><div className="spinner-simple"></div>Calculando...</div> : (
              <>
                <table className="tabela-salarios">
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Bruto Base</th>
                      <th className="text-red">Desc. Oficiais</th>
                      <th className="text-red">Outros Desc.</th>
                      <th className="text-green">Líquido Final</th>
                      <th>Custo Empresa</th>
                      <th width="80px">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folhaData.length === 0 && <tr><td colSpan="7" className="empty-state">Nenhum dado encontrado.</td></tr>}
                    {folhaData.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className={`linha-principal ${detalheExpandido === item.id ? 'active' : ''}`} onClick={() => setDetalheExpandido(detalheExpandido === item.id ? null : item.id)}>
                          <td>
                            <div className="colaborador-info">
                              <div className="avatar-circle">{item.nome_completo.charAt(0)}</div>
                              <div><span className="nome">{item.nome_completo}</span><span className="cargo-mini">{item.cargo}</span></div>
                            </div>
                          </td>
                          <td className="font-medium">{formatCurrency(item.calculo.salarioBruto)}</td>
                          <td className="text-red">- {formatCurrency(item.calculo.inss + item.calculo.irrf)}</td>
                          <td className="text-red font-bold">{item.calculo.totalDescontosExtras > 0 ? `- ${formatCurrency(item.calculo.totalDescontosExtras)}` : '--'}</td>
                          <td className="text-green font-bold cell-liquido">{formatCurrency(item.calculo.salarioLiquido)}</td>
                          <td className="text-secondary">{formatCurrency(item.calculo.custoEmpresa)}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button className="btn-icon-action" onClick={() => handleOpenGestao(item)} title="Gerenciar Benefícios">
                              <span className="material-symbols-outlined">edit_document</span>
                            </button>
                          </td>
                        </tr>
                        
                        {/* Detalhes Expansíveis */}
                        {detalheExpandido === item.id && (
                          <tr className="linha-detalhes fade-in">
                            <td colSpan="7">
                              <div className="detalhes-wrapper">
                                <div className="detalhes-grid">
                                  <div className="bloco-detalhe">
                                    <h4>Composição Salarial</h4>
                                    <div className="detalhe-row"><span>Salário Base:</span> <strong>{formatCurrency(item.calculo.salarioBruto)}</strong></div>
                                    {/* Lista Proventos Extras */}
                                    {item.beneficios.filter(b => b.tipo === 'Provento').map(b => (
                                      <div key={b.id} className="detalhe-row text-green"><span>(+) {b.nome}:</span> <span>{formatCurrency(b.valor)}</span></div>
                                    ))}
                                    <div className="detalhe-row text-red"><span>(-) INSS:</span> <span>{formatCurrency(item.calculo.inss)}</span></div>
                                    <div className="detalhe-row text-red"><span>(-) IRRF:</span> <span>{formatCurrency(item.calculo.irrf)}</span></div>
                                    {/* Lista Descontos Extras */}
                                    {item.beneficios.filter(b => b.tipo === 'Desconto').map(b => (
                                      <div key={b.id} className="detalhe-row text-red-dark"><span>(-) {b.nome}:</span> <span>{formatCurrency(b.valor)}</span></div>
                                    ))}
                                    <div className="detalhe-row total-row"><span>Líquido:</span> <span className="text-green">{formatCurrency(item.calculo.salarioLiquido)}</span></div>
                                  </div>
                                  
                                  <div className="bloco-detalhe empresa-bg">
                                    <h4>Custo para Empresa</h4>
                                    <div className="detalhe-row"><span>Salário Base:</span> <span>{formatCurrency(item.calculo.salarioBruto)}</span></div>
                                    <div className="detalhe-row"><span>FGTS (8%):</span> <span>{formatCurrency(item.calculo.fgts)}</span></div>
                                    {item.calculo.totalProventosExtras > 0 && <div className="detalhe-row"><span>Proventos Extras:</span> <span>{formatCurrency(item.calculo.totalProventosExtras)}</span></div>}
                                    <div className="detalhe-row total-row"><span>Total Mensal:</span> <span className="text-blue">{formatCurrency(item.calculo.custoEmpresa)}</span></div>
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
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* --- ABA 2: GESTÃO BENEFÍCIOS --- */}
      {activeTab === 'beneficios' && selectedFuncionario && (
        <div className="gestao-beneficios-wrapper fade-in">
          <button className="btn-back" onClick={() => setActiveTab('folha')}>← Voltar para Lista</button>
          <GestaoBeneficios 
            funcionario={selectedFuncionario} 
            beneficios={beneficiosMap[selectedFuncionario.id] || []}
            onUpdate={fetchDados}
          />
        </div>
      )}
    </div>
  );
}

export default SalariosPage;