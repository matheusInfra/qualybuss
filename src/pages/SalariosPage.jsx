import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { calcularSalarioLiquido } from '../utils/calculadoraSalario';
import { toast } from 'react-hot-toast';
import './SalariosPage.css';

function SalariosPage() {
  // --- ESTADOS DE FILTRO E PAGINAÇÃO ---
  const [filtros, setFiltros] = useState({
    empresa: '',
    departamento: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DE DADOS ---
  const [folhaData, setFolhaData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [detalheExpandido, setDetalheExpandido] = useState(null);

  // Carrega empresas para o select de filtro
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);

  // Lista de departamentos (Idealmente viria do banco, aqui estático por enquanto)
  const departamentos = [
    "Administrativo", "Financeiro", "Comercial", "TI", "Operacional", "RH", "Logística", "Diretoria"
  ];

  // --- BUSCA OTIMIZADA (SERVER-SIDE) ---
  const fetchDados = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Busca dados filtrados no servidor
      const res = await getFuncionarios({
        page,
        limit: 10, // Paginação leve (10 por vez)
        search: filtros.search,
        empresaId: filtros.empresa || null,
        departamento: filtros.departamento || null,
        status: 'Ativo'
      });

      // 2. Realiza cálculos financeiros (Bruto -> Líquido -> Custo) apenas para os dados visíveis
      const dadosCalculados = res.data.map(func => {
        const calculo = calcularSalarioLiquido(Number(func.salario_bruto) || 0, func.qtd_dependentes || 0);
        return { ...func, calculo };
      });

      setFolhaData(dadosCalculados);
      setTotalCount(res.count);
      setTotalPages(res.totalPages);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar folha de pagamento.");
    } finally {
      setLoading(false);
    }
  }, [page, filtros]); // Recarrega se página ou filtros mudarem (quando aplicados)

  // Dispara a busca quando a página muda
  useEffect(() => {
    fetchDados();
  }, [page]); 

  // --- HANDLERS ---
  const handleFiltrar = (e) => {
    e.preventDefault();
    setPage(1); // Volta para a primeira página ao filtrar
    fetchDados();
  };

  const handleLimpar = () => {
    setFiltros({ empresa: '', departamento: '', search: '' });
    setPage(1);
    // Pequeno delay para garantir que o estado limpou antes de buscar
    setTimeout(() => {
      // Chama fetchDados manualmente ou deixa o useEffect cuidar se dependências mudarem
      // Aqui forçamos um reload limpo
      window.location.reload(); // Ou refazer a lógica de limpar e buscar sem reload
    }, 100);
  };

  const toggleDetalhes = (id) => {
    setDetalheExpandido(detalheExpandido === id ? null : id);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="salarios-container fade-in">
      <header className="page-header-salarios">
        <div>
          <h1>Gestão de Salários</h1>
          <p>Visão detalhada de custos e rendimentos (Bruto x Líquido)</p>
        </div>
        
        {/* Resumo Rápido da Visualização Atual */}
        <div className="resumo-cards-mini">
          <div className="card-mini">
            <small>Colaboradores (Total)</small>
            <strong>{totalCount}</strong>
          </div>
          <div className="card-mini highlight">
            <small>Folha Bruta (Pág. Atual)</small>
            <strong>{formatCurrency(folhaData.reduce((acc, curr) => acc + curr.calculo.salarioBruto, 0))}</strong>
          </div>
        </div>
      </header>

      {/* --- BARRA DE FILTROS --- */}
      <div className="filtros-bar">
        <form onSubmit={handleFiltrar} className="filtros-grid">
          <div className="form-group">
            <label>Buscar (Nome/Cargo)</label>
            <div className="input-icon">
              <span className="material-symbols-outlined">search</span>
              <input 
                type="text" 
                placeholder="Ex: João..." 
                value={filtros.search}
                onChange={(e) => setFiltros({...filtros, search: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Empresa</label>
            <select 
              value={filtros.empresa}
              onChange={(e) => setFiltros({...filtros, empresa: e.target.value})}
            >
              <option value="">Todas as Empresas</option>
              {empresas?.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Departamento</label>
            <select
              value={filtros.departamento}
              onChange={(e) => setFiltros({...filtros, departamento: e.target.value})}
            >
              <option value="">Todos</option>
              {departamentos.map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>

          <div className="filtros-actions">
            <button type="button" className="btn-secondary" onClick={() => { setFiltros({ empresa: '', departamento: '', search: '' }); setPage(1); }}>
              Limpar
            </button>
            <button type="submit" className="btn-primary">
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* --- TABELA DE DADOS --- */}
      <div className="tabela-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner-simple"></div>
            <p>Calculando folha...</p>
          </div>
        ) : folhaData.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined">money_off</span>
            <p>Nenhum colaborador encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <>
            <table className="tabela-salarios">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Salário Base (Bruto)</th>
                  <th className="text-red">Descontos (Estimado)</th>
                  <th className="text-green">Salário Líquido</th>
                  <th>Custo Empresa (+FGTS)</th>
                  <th width="50px"></th>
                </tr>
              </thead>
              <tbody>
                {folhaData.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className={`linha-principal ${detalheExpandido === item.id ? 'active' : ''}`} onClick={() => toggleDetalhes(item.id)}>
                      <td>
                        <div className="colaborador-info">
                          <div className="avatar-circle">{item.nome_completo.charAt(0)}</div>
                          <div>
                            <span className="nome">{item.nome_completo}</span>
                            <span className="cargo-mini">{item.cargo} • {item.departamento || 'Geral'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="font-medium">{formatCurrency(item.calculo.salarioBruto)}</td>
                      <td className="text-red font-medium">- {formatCurrency(item.calculo.totalDescontos)}</td>
                      <td className="text-green font-bold cell-liquido">
                        {formatCurrency(item.calculo.salarioLiquido)}
                      </td>
                      <td className="text-secondary font-medium">{formatCurrency(item.calculo.custoEmpresa)}</td>
                      <td className="text-center">
                        <span className="material-symbols-outlined icon-expand">
                          {detalheExpandido === item.id ? 'expand_less' : 'expand_more'}
                        </span>
                      </td>
                    </tr>
                    
                    {/* LINHA EXPANSÍVEL DE DETALHES */}
                    {detalheExpandido === item.id && (
                      <tr className="linha-detalhes fade-in">
                        <td colSpan="6">
                          <div className="detalhes-wrapper">
                            <div className="detalhes-grid">
                              {/* Visão do Colaborador */}
                              <div className="bloco-detalhe">
                                <h4><span className="material-symbols-outlined">person</span> Visão do Colaborador</h4>
                                <div className="detalhe-row"><span>(+) Salário Bruto</span> <strong>{formatCurrency(item.calculo.salarioBruto)}</strong></div>
                                <div className="detalhe-row text-red"><span>(-) INSS</span> <span>{formatCurrency(item.calculo.inss)}</span></div>
                                <div className="detalhe-row text-red"><span>(-) IRRF</span> <span>{formatCurrency(item.calculo.irrf)}</span></div>
                                <div className="detalhe-row text-red"><span>(-) Outros/Convênios</span> <span>{formatCurrency(item.calculo.outrosDescontos)}</span></div>
                                <div className="detalhe-row total-row">
                                  <span>(=) Líquido a Receber</span>
                                  <span className="text-green">{formatCurrency(item.calculo.salarioLiquido)}</span>
                                </div>
                              </div>
                              
                              {/* Visão da Empresa */}
                              <div className="bloco-detalhe empresa-bg">
                                <h4><span className="material-symbols-outlined">domain</span> Visão do Empregador (Custo)</h4>
                                <div className="detalhe-row"><span>Salário Base</span> <span>{formatCurrency(item.calculo.salarioBruto)}</span></div>
                                <div className="detalhe-row"><span>FGTS (8%)</span> <span>{formatCurrency(item.calculo.fgts)}</span></div>
                                <div className="detalhe-row"><span>Provisão Férias/13º (Est.)</span> <span>{formatCurrency(item.calculo.salarioBruto * 0.11)}</span></div>
                                <div className="detalhe-row total-row">
                                  <span>(=) Custo Mensal Estimado</span>
                                  <span className="text-blue">{formatCurrency(item.calculo.custoEmpresa + (item.calculo.salarioBruto * 0.11))}</span>
                                </div>
                                <div className="info-extra">
                                  <small>*Cálculo estimado para regime Simples/Presumido.</small>
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

            {/* CONTROLE DE PAGINAÇÃO */}
            <div className="paginacao-container">
              <span>Página {page} de {totalPages || 1}</span>
              <div className="paginacao-btns">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <span className="material-symbols-outlined">chevron_left</span> Anterior
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Próxima <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SalariosPage;