import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getMovimentacoesFiltradas, createMovimentacao } from '../services/movimentacaoService';
// CORREÇÃO: Importamos getFuncionariosDropdown para preencher o select
import { getFuncionariosDropdown, desligarFuncionario } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import './MovimentacoesPage.css';

const MovimentacoesPage = () => {
  const [filtros, setFiltros] = useState({
    funcionarioId: '',
    tipo: 'Todos',
    // Padrão: Últimos 30 dias para performance
    dataInicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0]
  });

  const [movimentacoes, setMovimentacoes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id_funcionario: '',
    tipo: 'Promoção',
    data_movimentacao: new Date().toISOString().split('T')[0],
    descricao: '',
    cargo_novo: '',
    departamento_novo: '',
    empresa_nova: ''
  });

  useEffect(() => {
    // CORREÇÃO: Usamos Promise.all para carregar os dados auxiliares
    Promise.all([
      getFuncionariosDropdown(), // Função leve que retorna array simples
      getEmpresas()
    ]).then(([funcs, emps]) => {
      setFuncionarios(funcs || []);
      setEmpresas(emps || []);
    }).catch(err => {
      console.error("Erro ao carregar dados iniciais:", err);
      toast.error("Erro ao carregar listas de seleção.");
    });
  }, []);

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
      // REGRA DE NEGÓCIO CRÍTICA: Desligamento
      // Se o usuário escolheu "Desligamento" aqui, precisamos inativar o funcionário real
      if (formData.tipo === 'Desligamento') {
        const confirmacao = window.confirm("ATENÇÃO: Você selecionou 'Desligamento'. Isso irá INATIVAR o acesso do colaborador ao sistema. Confirma?");
        if (!confirmacao) return;

        await desligarFuncionario(formData.id_funcionario, {
          data_desligamento: formData.data_movimentacao,
          motivo: formData.descricao
        });

        toast.success("Colaborador desligado e inativado com sucesso.");
      } else {
        // Fluxo Normal (Promoção, Transferência, etc)
        const payload = {
          id_funcionario: formData.id_funcionario,
          tipo: formData.tipo,
          data_movimentacao: formData.data_movimentacao,
          descricao: formData.descricao,
          cargo_novo: ['Promoção', 'Alteração de Cargo'].includes(formData.tipo) ? formData.cargo_novo : null,
          departamento_novo: formData.tipo === 'Transferência' ? formData.departamento_novo : null,
          empresa_nova: formData.tipo === 'Transferência' ? formData.empresa_nova : null,
          salario_novo: null // Segurança: Salário não é alterado aqui
        };

        await createMovimentacao(payload);
        toast.success("Movimentação registrada!");
      }

      setModalOpen(false);
      carregarMovimentacoes();
    } catch (error) {
      toast.error("Erro: " + error.message);
    }
  };

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
              className="form-control"
            />
          </div>
        );
      case 'Transferência':
        return (
          <>
            <div className="form-group highlight-box">
              <label>Novo Departamento</label>
              <input type="text" name="departamento_novo" value={formData.departamento_novo} onChange={handleInputChange} className="form-control" />
            </div>
            <div className="form-group highlight-box">
              <label>Nova Unidade</label>
              <select name="empresa_nova" value={formData.empresa_nova} onChange={handleInputChange} className="form-control">
                <option value="">Manter atual</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
              </select>
            </div>
          </>
        );
      case 'Desligamento':
        return (
          <div className="form-group span-2 highlight-box danger-box">
            <p className="info-text danger-text">
              🛑 Esta ação irá inativar o cadastro do funcionário imediatamente.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';

  return (
    <div className="movimentacoes-container">
      <div className="movimentacoes-header">
        <div>
          <h1>Histórico Funcional</h1>
          <p>Gestão de cargos, transferências e ocorrências.</p>
        </div>
        <button onClick={openModal} className="btn btn-primary">
          <span className="material-symbols-outlined">add_circle</span> Nova Movimentação
        </button>
      </div>

      <div className="filtros-wrapper">
        <div className="filtro-item">
          <label>Período</label>
          <div className="date-range">
            <input type="date" value={filtros.dataInicio} onChange={e => setFiltros({ ...filtros, dataInicio: e.target.value })} />
            <span>até</span>
            <input type="date" value={filtros.dataFim} onChange={e => setFiltros({ ...filtros, dataFim: e.target.value })} />
          </div>
        </div>
        <div className="filtro-item grow">
          <label>Colaborador</label>
          <select value={filtros.funcionarioId} onChange={e => setFiltros({ ...filtros, funcionarioId: e.target.value })}>
            <option value="">Todos</option>
            {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
          </select>
        </div>
        <div className="filtro-item">
          <label>Tipo</label>
          <select value={filtros.tipo} onChange={e => setFiltros({ ...filtros, tipo: e.target.value })}>
            <option>Todos</option>
            <option>Promoção</option>
            <option>Transferência</option>
            <option>Desligamento</option>
            <option>Advertência</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        {loading ? <div className="loading">Carregando...</div> :
          movimentacoes.length === 0 ? <div className="empty">Nenhum registro.</div> : (
            <table className="mov-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Colaborador</th>
                  <th>Tipo</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((mov) => (
                  <tr key={mov.id}>
                    <td>{formatDate(mov.data_movimentacao)}</td>
                    <td>{mov.funcionarios?.nome_completo}</td>
                    <td><span className={`badge-tipo ${mov.tipo}`}>{mov.tipo}</span></td>
                    <td>
                      <div className="detalhe-conteudo">
                        {mov.cargo_novo && <div>Cargo: ➝ <strong>{mov.cargo_novo}</strong></div>}
                        <span className="motivo-texto">{mov.descricao}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-smart">
            <div className="modal-smart-header">
              <h3>Registrar Movimentação</h3>
              <button onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="modal-smart-body">
              <div className="form-smart-grid">
                <div className="form-group span-2">
                  <label>Colaborador</label>
                  <select name="id_funcionario" value={formData.id_funcionario} onChange={handleInputChange} required>
                    <option value="">Selecione...</option>
                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tipo</label>
                  <select name="tipo" value={formData.tipo} onChange={handleInputChange}>
                    <option>Promoção</option>
                    <option>Transferência</option>
                    <option>Alteração de Cargo</option>
                    <option>Mérito</option>
                    <option>Advertência</option>
                    <option>Desligamento</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Data</label>
                  <input type="date" name="data_movimentacao" value={formData.data_movimentacao} onChange={handleInputChange} required />
                </div>

                <div className="dynamic-area span-2">{renderCamposDinamicos()}</div>

                <div className="form-group span-2">
                  <label>Justificativa *</label>
                  <textarea name="descricao" rows="2" value={formData.descricao} onChange={handleInputChange} required></textarea>
                </div>
              </div>
              <div className="modal-smart-footer">
                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                <button type="submit" className="btn btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimentacoesPage;