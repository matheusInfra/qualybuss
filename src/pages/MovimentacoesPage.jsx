import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { getMovimentacoes, criarMovimentacao, excluirMovimentacao } from '../services/movimentacaoService';
import { getEmpresas } from '../services/empresaService';
import './MovimentacoesPage.css';

export default function MovimentacoesPage() {
  const [empresaId, setEmpresaId] = useState('');
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  // Carrega empresas
  const { data: empresas } = useSWR('getEmpresas', getEmpresas, {
    onSuccess: (data) => {
      if (data?.length > 0 && !empresaId) setEmpresaId(data[0].id);
    }
  });

  // Carrega movimentações
  const { data: movimentacoes, mutate } = useSWR(
    empresaId ? ['getMovimentacoes', empresaId] : null,
    () => getMovimentacoes(empresaId)
  );

  // Carrega dropdown de funcionários quando muda a empresa
  useEffect(() => {
    if (empresaId) {
      carregarFuncionarios();
    }
  }, [empresaId]);

  const carregarFuncionarios = async () => {
    try {
      const data = await getFuncionariosDropdown(empresaId);
      setFuncionarios(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar lista de funcionários.");
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await criarMovimentacao({
        empresa_id: empresaId,
        funcionario_id: data.funcionario_id,
        tipo: data.tipo,
        valor: parseFloat(data.valor),
        descricao: data.descricao,
        data_movimentacao: data.data_movimentacao
      });
      toast.success("Movimentação lançada!");
      reset();
      mutate(); // Recarrega a lista
    } catch (error) {
      toast.error("Erro ao lançar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir lançamento?")) return;
    try {
      await excluirMovimentacao(id);
      toast.success("Excluído.");
      mutate();
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="movimentacoes-container fade-in">
      <header className="page-header">
        <h1>Lançamentos Avulsos</h1>
        <div className="empresa-select-wrapper">
          <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}>
            {empresas?.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="movimentacoes-grid">
        {/* Formulário */}
        <div className="form-card">
          <h3>Novo Lançamento</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label>Colaborador</label>
              <select {...register('funcionario_id')} required>
                <option value="">Selecione...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_completo}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select {...register('tipo')} required>
                  <option value="Bonus">Bônus / Prêmio (+)</option>
                  <option value="Comissao">Comissão (+)</option>
                  <option value="Desconto">Desconto Diverso (-)</option>
                  <option value="Adiantamento">Adiantamento (-)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" {...register('valor')} required />
              </div>
            </div>

            <div className="form-group">
              <label>Data</label>
              <input type="date" {...register('data_movimentacao')} required />
            </div>

            <div className="form-group">
              <label>Descrição</label>
              <input {...register('descricao')} placeholder="Ex: Meta batida mês X" />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Lançar'}
            </button>
          </form>
        </div>

        {/* Lista Histórico */}
        <div className="historico-card">
          <h3>Histórico Recente</h3>
          <div className="table-wrapper">
            <table className="mov-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Colaborador</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes?.map(mov => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.data_movimentacao).toLocaleDateString()}</td>
                    <td>{mov.funcionario?.nome_completo}</td>
                    <td><span className={`badge-tipo ${mov.tipo}`}>{mov.tipo}</span></td>
                    <td className={mov.tipo === 'Desconto' || mov.tipo === 'Adiantamento' ? 'text-red' : 'text-green'}>
                      {fmt(mov.valor)}
                    </td>
                    <td>
                      <button className="btn-delete-mini" onClick={() => handleDelete(mov.id)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!movimentacoes?.length && (
                  <tr><td colSpan="5" className="empty-cell">Nenhum lançamento neste período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}