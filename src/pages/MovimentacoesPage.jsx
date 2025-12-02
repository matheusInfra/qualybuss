// src/pages/MovimentacoesPage.jsx
import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';

// Services
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { createMovimentacao, getMovimentacoesFiltradas } from '../services/movimentacaoService';

// Estilos
import './MovimentacoesPage.css';

const initialState = {
  id_funcionario: '',
  data_movimentacao: new Date().toISOString().split('T')[0],
  tipo: 'Promoção',
  descricao: '',
  cargo_anterior: '',
  cargo_novo: '',
  salario_anterior: '',
  salario_novo: '',
  empresa_anterior: '',
  empresa_nova: '',
  departamento_anterior: '',
  departamento_novo: ''
};

// --- COMPONENTE DE HISTÓRICO INTELIGENTE (COM FILTROS) ---
function HistoricoMovimentacoes({ filtros }) {
  const cacheKey = ['movimentacoes', JSON.stringify(filtros)];

  const { data: movimentacoes, error, isLoading } = useSWR(cacheKey, () => getMovimentacoesFiltradas(filtros));

  if (isLoading) return <div className="loading-state">Carregando análises...</div>;
  if (error) return <div className="error-state">Erro ao carregar: {error.message}</div>;

  if (!movimentacoes || movimentacoes.length === 0) {
    return (
      <div className="empty-state-ajustes">
        <span className="material-symbols-outlined">history_edu</span>
        <p>Nenhum registro encontrado para este filtro.</p>
      </div>
    );
  }

  const formatCurrency = (val) => val ? `R$ ${parseFloat(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

  return (
    <div className="tabela-container fade-in">
      <div className="kpi-resumo" style={{ marginBottom: '1rem', color: 'var(--slate-500)', fontSize: '0.85rem', textAlign: 'right' }}>
        Total: <strong>{movimentacoes.length}</strong> registros encontrados.
      </div>

      <table className="historico-table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Detalhes da Mudança</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoes.map(mov => {
            const func = mov.funcionarios;

            let detalhes = mov.descricao;
            if (mov.tipo === 'Promoção' || mov.tipo.includes('Cargo')) {
              detalhes = `${mov.cargo_anterior || '?'} ➝ ${mov.cargo_novo || '?'}`;
            } else if (mov.tipo.includes('Salarial') || mov.tipo.includes('Reajuste')) {
              detalhes = `${formatCurrency(mov.salario_anterior)} ➝ ${formatCurrency(mov.salario_novo)}`;
            } else if (mov.tipo === 'Transferência') {
              detalhes = `${mov.departamento_anterior || 'Antigo'} ➝ ${mov.departamento_novo || 'Novo'}`;
            }

            return (
              <tr key={mov.id}>
                <td>
                  <div className="colaborador-cell">
                    {func?.avatar_url ? (
                      <img src={func.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar-placeholder-small" style={{ width: 28, height: 28, background: 'var(--slate-200)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>{func?.nome_completo?.charAt(0)}</div>
                    )}
                    <span className="colaborador-nome">{func?.nome_completo || 'Desconhecido'}</span>
                  </div>
                </td>
                <td>{new Date(mov.data_movimentacao.replace(/-/g, '/')).toLocaleDateString('pt-BR')}</td>
                <td><span className={`tipo-pill ${mov.tipo === 'Desligamento' ? 'danger' : ''}`}>{mov.tipo}</span></td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{detalhes}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{mov.descricao}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MovimentacoesPage() {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWRConfig();

  const [filtros, setFiltros] = useState({
    funcionarioId: '',
    tipo: '',
    dataInicio: '',
    dataFim: ''
  });

  const { data: funcionarios, isLoading: isLoadingFunc } = useSWR('getFuncionarios', getFuncionarios);
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'id_funcionario') {
      const func = funcionarios?.find(f => f.id === value);
      if (func) {
        setFormData(prev => ({
          ...prev,
          cargo_anterior: func.cargo || '',
          salario_anterior: func.salario_bruto || '',
          departamento_anterior: func.departamento || '',
          empresa_anterior: func.empresa_id || ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_funcionario || !formData.tipo || !formData.data_movimentacao) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      const novosDados = { ...formData };
      Object.keys(novosDados).forEach(key => {
        if (novosDados[key] === '') novosDados[key] = null;
      });

      await createMovimentacao(novosDados);

      mutate(['movimentacoes', JSON.stringify(filtros)]);
      mutate('getFuncionarios');
      mutate('dashboard_kpis');

      toast.success('Movimentação registrada e cadastro atualizado!');
      setFormData(initialState);

    } catch (err) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCamposDinamicos = () => {
    const tipo = formData.tipo;
    if (['Promoção', 'Reclassificação', 'Outro'].includes(tipo)) {
      return (
        <>
          <div className="movimentacao-group">
            <label>Cargo Anterior</label>
            <input type="text" value={formData.cargo_anterior} disabled />
          </div>
          <div className="movimentacao-group">
            <label style={{ color: 'var(--primary-600)' }}>Novo Cargo</label>
            <input type="text" name="cargo_novo" value={formData.cargo_novo} onChange={handleChange} placeholder="Novo cargo..." />
          </div>
        </>
      );
    }
    return null;
  };

  const renderCamposSalario = () => {
    const tipo = formData.tipo;
    if (['Ajuste Salarial', 'Promoção', 'Mérito'].includes(tipo)) {
      return (
        <>
          <div className="movimentacao-group">
            <label>Salário Anterior (R$)</label>
            <input type="number" value={formData.salario_anterior} disabled />
          </div>
          <div className="movimentacao-group">
            <label style={{ color: 'var(--primary-600)' }}>Novo Salário (R$)</label>
            <input type="number" step="0.01" name="salario_novo" value={formData.salario_novo} onChange={handleChange} placeholder="0.00" />
          </div>
        </>
      );
    }
    return null;
  };

  const renderCamposTransferencia = () => {
    const tipo = formData.tipo;
    if (['Transferência'].includes(tipo)) {
      return (
        <>
          <div className="movimentacao-group">
            <label>Departamento Atual</label>
            <input type="text" value={formData.departamento_anterior} disabled />
          </div>
          <div className="movimentacao-group">
            <label style={{ color: 'var(--primary-600)' }}>Novo Departamento</label>
            <input type="text" name="departamento_novo" value={formData.departamento_novo} onChange={handleChange} placeholder="Novo departamento..." />
          </div>

          <div className="movimentacao-group">
            <label>Empresa Atual</label>
            <input type="text" value={empresas?.find(e => e.id === formData.empresa_anterior)?.nome_fantasia || 'Atual'} disabled />
          </div>
          <div className="movimentacao-group">
            <label style={{ color: 'var(--primary-600)' }}>Nova Empresa</label>
            <select name="empresa_nova" value={formData.empresa_nova} onChange={handleChange}>
              <option value="">Selecione...</option>
              {empresas?.map(e => (
                <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
              ))}
            </select>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="movimentacoes-container">
      <div className="movimentacoes-header">
        <h1>Gestão de Movimentações</h1>
        <p>Registre promoções, alterações e transferências. O sistema atualiza o cadastro automaticamente.</p>
      </div>

      {/* FORMULÁRIO DE REGISTRO */}
      <div className="movimentacao-form-wrapper">
        <h3 className="form-section-title">Novo Registro Individual</h3>
        <form onSubmit={handleSubmit}>
          <div className="movimentacao-grid">

            <div className="movimentacao-group span-2">
              <label>Colaborador *</label>
              <select
                name="id_funcionario"
                value={formData.id_funcionario}
                onChange={handleChange}
                disabled={isLoadingFunc}
                required
              >
                <option value="">{isLoadingFunc ? 'Carregando...' : 'Selecione um colaborador'}</option>
                {funcionarios?.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_completo}</option>
                ))}
              </select>
            </div>

            <div className="movimentacao-group">
              <label>Data Efetiva *</label>
              <input type="date" name="data_movimentacao" value={formData.data_movimentacao} onChange={handleChange} required />
            </div>

            <div className="movimentacao-group">
              <label>Tipo de Ação *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} required style={{ borderColor: 'var(--primary-500)', backgroundColor: 'var(--primary-50)' }}>
                <option value="Promoção">Promoção</option>
                <option value="Ajuste Salarial">Ajuste Salarial (Dissídio/Mérito)</option>
                <option value="Transferência">Transferência (Depto/Empresa)</option>
                <option value="Reclassificação">Reclassificação</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="movimentacao-group span-4">
              <label>Justificativa *</label>
              <input type="text" name="descricao" placeholder="Ex: Promoção por mérito..." value={formData.descricao} onChange={handleChange} required />
            </div>

            <div className="divider"></div>

            {renderCamposTransferencia()}
            {renderCamposDinamicos()}
            {renderCamposSalario()}

          </div>
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? '...' : 'Confirmar e Salvar'}
            </button>
          </div>
        </form>
      </div>

      {/* ÁREA DE ANÁLISE E FILTROS */}
      <div className="analise-section">
        <div className="analise-header">
          <span className="material-symbols-outlined">analytics</span>
          <h2>Histórico e Análise</h2>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="filtros-bar">
          <div className="filtro-group">
            <label>Filtrar por Colaborador</label>
            <select
              value={filtros.funcionarioId}
              onChange={(e) => setFiltros({ ...filtros, funcionarioId: e.target.value })}
            >
              <option value="">Todos os Colaboradores</option>
              {funcionarios?.map(f => (
                <option key={f.id} value={f.id}>{f.nome_completo}</option>
              ))}
            </select>
          </div>

          <div className="filtro-group">
            <label>Tipo</label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="Promoção">Promoção</option>
              <option value="Ajuste Salarial">Ajuste Salarial</option>
              <option value="Transferência">Transferência</option>
              <option value="Reajuste Coletivo">Reajuste Coletivo</option>
              <option value="Desligamento">Desligamento</option>
            </select>
          </div>

          <div className="filtro-group">
            <label>De</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
            />
          </div>

          <div className="filtro-group">
            <label>Até</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
            />
          </div>
        </div>

        {/* TABELA REATIVA */}
        <HistoricoMovimentacoes filtros={filtros} />
      </div>
    </div>
  );
}

export default MovimentacoesPage;