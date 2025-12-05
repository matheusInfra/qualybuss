import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Assumindo sua instância axios padrão
import funcionarioService from '../services/funcionarioService';

const MovimentacoesPage = () => {
  // Estados para dados
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  
  // Estados de controle de UI
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    id: null,
    descricao: '',
    tipo: 'SAIDA', // ou 'ENTRADA'
    valor: '',
    data: '',
    funcionarioId: ''
  });

  // --- Carregamento Inicial ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carrega movimentações e funcionários em paralelo
      const [movResponse, funcResponse] = await Promise.all([
        api.get('/movimentacoes'),
        funcionarioService.getAll()
      ]);
      
      setMovimentacoes(movResponse.data);
      setFuncionarios(funcResponse || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      alert("Erro ao carregar dados. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  // --- Manipuladores do Formulário ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (movimentacao = null) => {
    if (movimentacao) {
      // Modo Edição: Preenche o form e formata a data para o input date (YYYY-MM-DD)
      setIsEditing(true);
      setFormData({
        ...movimentacao,
        data: movimentacao.data ? movimentacao.data.split('T')[0] : '',
        funcionarioId: movimentacao.funcionarioId || ''
      });
    } else {
      // Modo Criação: Limpa o form
      setIsEditing(false);
      setFormData({
        id: null,
        descricao: '',
        tipo: 'SAIDA',
        valor: '',
        data: new Date().toISOString().split('T')[0], // Data de hoje
        funcionarioId: ''
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      // Prepara payload (converte valor para número se necessário)
      const payload = {
        ...formData,
        valor: parseFloat(formData.valor),
        funcionarioId: formData.funcionarioId ? parseInt(formData.funcionarioId) : null
      };

      if (isEditing && formData.id) {
        await api.put(`/movimentacoes/${formData.id}`, payload);
        alert('Movimentação atualizada com sucesso!');
      } else {
        await api.post('/movimentacoes', payload);
        alert('Movimentação criada com sucesso!');
      }
      
      closeModal();
      loadData(); // Recarrega a tabela
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar movimentação.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta movimentação?")) {
      try {
        await api.delete(`/movimentacoes/${id}`);
        loadData();
      } catch (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao excluir item.");
      }
    }
  };

  // --- Formatadores ---
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getFuncionarioName = (id) => {
    const func = funcionarios.find(f => f.id === id);
    return func ? func.nome : 'N/A';
  };

  // --- Renderização ---
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Movimentações</h1>
        <button 
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition"
        >
          + Nova Movimentação
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Carregando dados...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Funcionário</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Valor</th>
                <th className="px-6 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.length > 0 ? (
                movimentacoes.map((mov) => (
                  <tr key={mov.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{formatDate(mov.data)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{mov.descricao}</td>
                    <td className="px-6 py-4">{getFuncionarioName(mov.funcionarioId)}</td>
                    <td className={`px-6 py-4 font-bold ${mov.tipo === 'ENTRADA' ? 'text-green-600' : 'text-red-600'}`}>
                      {mov.tipo}
                    </td>
                    <td className="px-6 py-4">{formatCurrency(mov.valor)}</td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button 
                        onClick={() => openModal(mov)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(mov.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">Nenhuma movimentação encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Formulário */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? 'Editar Movimentação' : 'Nova Movimentação'}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <input
                  type="text"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                  >
                    <option value="SAIDA">Saída</option>
                    <option value="ENTRADA">Entrada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    value={formData.valor}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data</label>
                  <input
                    type="date"
                    name="data"
                    value={formData.data}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Funcionário</label>
                  <select
                    name="funcionarioId"
                    value={formData.funcionarioId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                  >
                    <option value="">-- Selecione --</option>
                    {funcionarios.map(func => (
                      <option key={func.id} value={func.id}>
                        {func.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimentacoesPage;