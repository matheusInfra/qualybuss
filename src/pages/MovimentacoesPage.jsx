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

  // Carrega Empresas
  const { data: empresas } = useSWR('getEmpresas', getEmpresas, {
    onSuccess: (data) => {
      if (data?.length > 0 && !empresaId) setEmpresaId(data[0].id);
    },
    onError: () => toast.error("Erro ao carregar empresas")
  });

  // Carrega Movimentações
  const keyMovimentacoes = empresaId ? ['getMovimentacoes', empresaId] : null;
  const { data: movimentacoes, mutate } = useSWR(
    keyMovimentacoes,
    () => getMovimentacoes(empresaId)
  );

  // Carrega Funcionários
  useEffect(() => {
    if (empresaId) {
      getFuncionariosDropdown(empresaId)
        .then(data => setFuncionarios(data || []))
        .catch(console.error);
    }
  }, [empresaId]);

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
      toast.success("Lançamento salvo!");
      reset();
      mutate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Excluir este lançamento?")) return;
    try {
      await excluirMovimentacao(id);
      toast.success("Excluído.");
      mutate();
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  const getTipoClass = (tipo) => {
    const t = tipo?.toLowerCase() || '';
    if (t.includes('bonus') || t.includes('comissao')) return 'bonus';
    if (t.includes('desconto') || t.includes('adiantamento')) return 'desconto';
    return 'ferias';
  };

  return (
    <div className="movimentacoes-container">
      <div className="mov-header">
        <h1>Movimentações Financeiras</h1>
        <select 
          className="mov-select-empresa"
          value={empresaId} 
          onChange={e => setEmpresaId(e.target.value)}
        >
          <option value="">Selecione a Empresa...</option>
          {empresas?.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
          ))}
        </select>
      </div>

      <div className="mov-grid">
        {/* Card Formulário */}
        <div className="mov-card">
          <h3>Novo Lançamento</h3>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mov-form-group">
              <label>Colaborador</label>
              <select {...register('funcionario_id')} required>
                <option value="">Selecione...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_completo}</option>
                ))}
              </select>
            </div>

            <div className="mov-form-group">
              <label>Tipo</label>
              <select {...register('tipo')} required>
                <option value="Bonus">Bônus (+)</option>
                <option value="Comissao">Comissão (+)</option>
                <option value="Desconto">Desconto (-)</option>
                <option value="Adiantamento">Adiantamento (-)</option>
              </select>
            </div>

            <div className="mov-form-group">
              <label>Valor (R$)</label>
              <input type="number" step="0.01" {...register('valor')} required placeholder="0.00" />
            </div>

            <div className="mov-form-group">
              <label>Data</label>
              <input type="date" {...register('data_movimentacao')} required />
            </div>

            <div className="mov-form-group">
              <label>Descrição</label>
              <input {...register('descricao')} placeholder="Motivo..." />
            </div>

            <button type="submit" className="btn-mov-submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Lançar'}
            </button>
          </form>
        </div>

        {/* Card Tabela */}
        <div className="mov-card">
          <h3>Histórico Recente</h3>
          <div className="mov-table-wrapper">
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
                {movimentacoes?.map(mov => {
                  const isPositive = ['Bonus', 'Comissao'].includes(mov.tipo_movimentacao || mov.tipo);
                  return (
                    <tr key={mov.id}>
                      <td>{new Date(mov.data_movimentacao).toLocaleDateString()}</td>
                      <td>{mov.funcionario?.nome_completo || '---'}</td>
                      <td>
                        <span className={`badge-mov ${getTipoClass(mov.tipo_movimentacao || mov.tipo)}`}>
                          {mov.tipo_movimentacao || mov.tipo}
                        </span>
                      </td>
                      <td className={isPositive ? 'val-positivo' : 'val-negativo'}>
                        {fmt(mov.valor)}
                      </td>
                      <td style={{textAlign: 'right'}}>
                        <button onClick={() => handleDelete(mov.id)} className="btn-trash" title="Excluir">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!movimentacoes?.length && (
                  <tr>
                    <td colSpan="5" style={{textAlign:'center', padding:'2rem', color:'#94a3b8'}}>
                      Nenhum lançamento encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}