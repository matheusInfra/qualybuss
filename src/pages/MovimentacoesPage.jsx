import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getMovimentacoesFiltradas, createMovimentacao } from '../services/movimentacaoService';
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import './MovimentacoesPage.css';

const MovimentacoesPage = () => {
  // --- Filtros (Performance: Padrão 30 dias) ---
  const [filtros, setFiltros] = useState({
    funcionarioId: '',
    tipo: 'Todos',
    dataInicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0]
  });

  // --- Dados ---
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // --- Formulário Inteligente ---
  const [formData, setFormData] = useState({
    id_funcionario: '',
    tipo: 'Promoção', // Valor inicial
    data_movimentacao: new Date().toISOString().split('T')[0],
    descricao: '',
    // Campos dinâmicos (opcionais dependendo do tipo)
    cargo_novo: '',
    departamento_novo: '',
    empresa_nova: ''
  });

  // Carga Inicial de Listas Auxiliares
  useEffect(() => {
    Promise.all([
      getFuncionarios(),
      getEmpresas()
    ]).then(([funcs, emps]) => {
      setFuncionarios(funcs || []);
      setEmpresas(emps || []);
    });
  }, []);

  // Recarrega lista principal quando filtros mudam
  useEffect(() => {
    carregarMovimentacoes();
  }, [filtros]);

  const carregarMovimentacoes = async () => {
    setLoading(true);
    try {
      const dados = await getMovimentacoesFiltradas({
        funcionarioId: filtros.funcionarioId || null,
        tipo: filtros.tipo === 'Todos' ? null : filtros.tipo,
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim
      });
      setMovimentacoes(dados || []);
    } catch (error) {
      console.error("Erro ao buscar:", error);
      toast.error("Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  };

  // --- Lógica do Formulário Inteligente ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = () => {
    setFormData({
      id_funcionario: '',
      tipo: 'Promoção',
      data_movimentacao: new Date().toISOString().split('T')[0],
      descricao: '',
      cargo_novo: '',
      departamento_novo: '',
      empresa_nova: ''
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.id_funcionario) return toast.error("Selecione o colaborador.");
    if (!formData.descricao) return toast.error("A justificativa é obrigatória.");

    try {
      // Prepara payload inteligente: envia NULL nos campos que não pertencem ao tipo escolhido
      const payload = {
        id_funcionario: formData.id_funcionario,
        tipo: formData.tipo,
        data_movimentacao: formData.data_movimentacao,
        descricao: formData.descricao,
        
        // Só envia cargo se for Promoção ou Alteração
        cargo_novo: ['Promoção', 'Alteração de Cargo'].includes(formData.tipo) ? formData.cargo_novo : null,
        
        // Só envia departamento se for Transferência
        departamento_novo: formData.tipo === 'Transferência' ? formData.departamento_novo : null,
        
        // Só envia empresa se for Transferência
        empresa_nova: formData.tipo === 'Transferência' ? formData.empresa_nova : null,
        
        // Salário sempre null aqui (Gerenciado no outro módulo)
        salario_novo: null 
      };

      await createMovimentacao(payload);
      
      toast.success("Movimentação registrada!");
      setModalOpen(false);
      carregarMovimentacoes();
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

  // Renderiza campos específicos baseados no TIPO
  const renderCamposDinamicos = () => {
    switch (formData.tipo) {
      case 'Promoção':
      case 'Alteração de Cargo':
        return (
          <div className="form-group span-2 highlight-box">
            <label>Novo Cargo *</label>
            <input 
              type="text" 
              name="cargo_novo" 
              value={formData.cargo_novo} 
              onChange={handleInputChange} 
              placeholder="Ex: Gerente Sênior"
              className="form-control"
            />
          </div>
        );
      
      case 'Transferência':
        return (
          <>
            <div className="form-group highlight-box">
              <label>Novo Departamento</label>
              <input 
                type="text" 
                name="departamento_novo" 
                value={formData.departamento_novo} 
                onChange={handleInputChange} 
                className="form-control"
              />
            </div>
            <div className="form-group highlight-box">
              <label>Nova Unidade/Empresa</label>
              <select 
                name="empresa_nova" 
                value={formData.empresa_nova} 
                onChange={handleInputChange} 
                className="form-control"
              >
                <option value="">Manter atual</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
                ))}
              </select>
            </div>
          </>
        );

      case 'Advertência':
      case 'Suspensão':
        return (
          <div className="form-group span-2 alert-box">
            <p className="info-text">?? Esta ação ficará registrada no histórico disciplinar do colaborador.</p>
          </div>
        );

      default:
        return null;
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-';

  return (
    <div className="movimentacoes-container">
      <div className="movimentacoes-header">
        <div>
          <h1>Histórico Funcional</h1>
          <p>Gestão de cargos, transferências e ocorrências.</p>
        </div>
        <button onClick={openModal} className="btn-novo">
          <span className="material-symbols-outlined">add_circle</span> Nova Movimentação
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="filtros-wrapper">
        <div className="filtro-item">
          <label>Período</label>
          <div className="date-range">
            <input type="date" value={filtros.dataInicio} onChange={e => setFiltros({...filtros, dataInicio: e.target.value})} />
            <span>até</span>
            <input type="date" value={filtros.dataFim} onChange={e => setFiltros({...filtros, dataFim: e.target.value})} />
          </div>
        </div>
        
        <div className="filtro-item grow">
          <label>Colaborador</label>
          <select value={filtros.funcionarioId} onChange={e => setFiltros({...filtros, funcionarioId: e.target.value})}>
            <option value="">Todos os Colaboradores</option>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
          </select>
        </div>

        <div className="filtro-item">
          <label>Tipo</label>
          <select value={filtros.tipo} onChange={e => setFiltros({...filtros, tipo: e.target.value})}>
            <option>Todos</option>
            <option>Promoção</option>
            <option>Transferência</option>
            <option>Mérito</option>
            <option>Advertência</option>
            <option>Desligamento</option>
          </select>
        </div>
      </div>

      {/* TABELA */}
      <div className="table-container">
        {loading ? <div className="loading">Carregando dados...</div> : 
         movimentacoes.length === 0 ? <div className="empty">Nenhum registro encontrado neste período.</div> : (
          <table className="mov-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Detalhes / Histórico</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map(mov => (
                <tr key={mov.id}>
                  <td style={{whiteSpace:'nowrap'}}>{formatDate(mov.data_movimentacao)}</td>
                  <td>
                    <div className="colab-info">
                      <div className="avatar-xs">{mov.funcionarios?.nome_completo?.charAt(0)}</div>
                      <span>{mov.funcionarios?.nome_completo}</span>
                    </div>
                  </td>
                  <td><span className={`badge-tipo ${mov.tipo}`}>{mov.tipo}</span></td>
                  <td>
                    <div className="detalhe-conteudo">
                      {mov.cargo_novo && mov.cargo_anterior !== mov.cargo_novo && (
                        <div className="mudanca-tag">Cargo: {mov.cargo_anterior} ? <strong>{mov.cargo_novo}</strong></div>
                      )}
                      {mov.departamento_novo && (
                        <div className="mudanca-tag">Depto: ? <strong>{mov.departamento_novo}</strong></div>
                      )}
                      <span className="motivo-texto">"{mov.descricao}"</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL INTELIGENTE */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-smart">
            <div className="modal-smart-header">
              <h3>Registrar Movimentação</h3>
              <button onClick={() => setModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSave} className="modal-smart-body">
              <div className="form-smart-grid">
                
                {/* Linha 1: Quem e O Quê */}
                <div className="form-group span-2">
                  <label>Colaborador</label>
                  <select name="id_funcionario" value={formData.id_funcionario} onChange={handleInputChange} required>
                    <option value="">Selecione...</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>{f.nome_completo} - {f.cargo}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Tipo de Ação</label>
                  <select name="tipo" value={formData.tipo} onChange={handleInputChange} className="select-tipo">
                    <option>Promoção</option>
                    <option>Transferência</option>
                    <option>Alteração de Cargo</option>
                    <option>Mérito</option>
                    <option>Advertência</option>
                    <option>Suspensão</option>
                    <option>Outros</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Data Efetiva</label>
                  <input type="date" name="data_movimentacao" value={formData.data_movimentacao} onChange={handleInputChange} required />
                </div>

                {/* ÁREA DINÂMICA (A Mágica acontece aqui) */}
                <div className="dynamic-area span-2">
                  {renderCamposDinamicos()}
                </div>

                {/* Descrição sempre visível */}
                <div className="form-group span-2">
                  <label>Justificativa / Observação *</label>
                  <textarea 
                    name="descricao" 
                    rows="3" 
                    value={formData.descricao} 
                    onChange={handleInputChange} 
                    placeholder="Descreva o motivo desta alteração..."
                    required
                  ></textarea>
                </div>

              </div>

              <div className="modal-smart-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-cancel">Cancelar</button>
                <button type="submit" className="btn-confirm">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimentacoesPage;