import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';

// Importações Corrigidas
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { getMovimentacoes, criarMovimentacao, excluirMovimentacao } from '../services/movimentacaoService';
import { getEmpresas } from '../services/empresaService';
import './MovimentacoesPage.css';

export default function MovimentacoesPage() {
  const [empresaId, setEmpresaId] = useState('');
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // React Hook Form
  const { register, handleSubmit, reset } = useForm();

  // 1. Carrega Empresas
  const { data: empresas } = useSWR('getEmpresas', getEmpresas, {
    onSuccess: (data) => {
      if (data?.length > 0 && !empresaId) setEmpresaId(data[0].id);
    },
    onError: () => toast.error("Erro ao carregar empresas")
  });

  // 2. Carrega Movimentações (depende da empresa)
  const keyMovimentacoes = empresaId ? ['getMovimentacoes', empresaId] : null;
  const { data: movimentacoes, mutate } = useSWR(
    keyMovimentacoes,
    () => getMovimentacoes(empresaId)
  );

  // 3. Carrega Funcionários (Dropdown)
  useEffect(() => {
    if (empresaId) carregarFuncionarios();
  }, [empresaId]);

  const carregarFuncionarios = async () => {
    try {
      const data = await getFuncionariosDropdown(empresaId);
      setFuncionarios(data || []);
    } catch (error) {
      console.error(error);
      // Não exibe toast aqui para não poluir se for apenas troca rápida
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
      toast.success("Movimentação lançada com sucesso!");
      reset();
      mutate(); // Atualiza a lista automaticamente
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar: " + (error.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    try {
      await excluirMovimentacao(id);
      toast.success("Registro excluído.");
      mutate();
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  // Formatador de Moeda
  const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="movimentacoes-container fade-in p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Lançamentos Avulsos</h1>
        <div className="w-64">
          <select 
            className="w-full p-2 border rounded"
            value={empresaId} 
            onChange={e => setEmpresaId(e.target.value)}
          >
            <option value="">Selecione uma Empresa...</option>
            {empresas?.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="bg-white p-6 rounded shadow lg:col-span-1 h-fit">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Novo Lançamento</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Colaborador</label>
              <select {...register('funcionario_id')} required className="w-full mt-1 p-2 border rounded">
                <option value="">Selecione...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome_completo}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select {...register('tipo')} required className="w-full mt-1 p-2 border rounded">
                  <option value="Bonus">Bônus (+)</option>
                  <option value="Comissao">Comissão (+)</option>
                  <option value="Desconto">Desconto (-)</option>
                  <option value="Adiantamento">Adiantamento (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Valor</label>
                <input 
                  type="number" step="0.01" 
                  {...register('valor')} required 
                  className="w-full mt-1 p-2 border rounded" 
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input 
                type="date" 
                {...register('data_movimentacao')} required 
                className="w-full mt-1 p-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Descrição</label>
              <input 
                {...register('descricao')} 
                className="w-full mt-1 p-2 border rounded" 
                placeholder="Motivo..."
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Lançar'}
            </button>
          </form>
        </div>

        {/* Lista Histórico */}
        <div className="bg-white p-6 rounded shadow lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Histórico Recente</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {movimentacoes?.map(mov => (
                  <tr key={mov.id}>
                    <td className="px-4 py-3 text-sm">{new Date(mov.data_movimentacao).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-medium">{mov.funcionario?.nome_completo || '---'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        ['Desconto', 'Adiantamento'].includes(mov.tipo_movimentacao || mov.tipo) 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                      }`}>
                        {mov.tipo_movimentacao || mov.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{fmt(mov.valor)}</td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => handleDelete(mov.id)} 
                        className="text-red-500 hover:text-red-700"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {!movimentacoes?.length && (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">Nenhum lançamento encontrado para esta empresa.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}