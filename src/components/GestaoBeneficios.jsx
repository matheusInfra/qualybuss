// src/components/GestaoBeneficios.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { saveBeneficios, deleteBeneficio } from '../services/beneficioService';

const GestaoBeneficios = ({ funcionarioId, dadosIniciais = [] }) => {
  const [beneficios, setBeneficios] = useState(dadosIniciais);
  const [loading, setLoading] = useState(false);
  const [novoBeneficio, setNovoBeneficio] = useState({
    nome: '',
    tipo: 'Desconto',
    tipo_valor: 'Valor Fixo',
    valor: '',
  });

  useEffect(() => {
    if(dadosIniciais) setBeneficios(dadosIniciais);
  }, [dadosIniciais]);

  const handleChange = (e) => {
    setNovoBeneficio({ ...novoBeneficio, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novoBeneficio.nome || !novoBeneficio.valor) return;

    setLoading(true);
    try {
      const itemParaSalvar = {
        funcionario_id: funcionarioId,
        ...novoBeneficio,
        valor: parseFloat(novoBeneficio.valor)
      };

      // Chama o serviço corrigido
      const salvo = await saveBeneficios(itemParaSalvar);
      
      // Se o serviço retornar o objeto salvo (com ID real), usamos ele.
      // Caso contrário (se for mock), usamos um ID temporário.
      const itemFinal = salvo || { ...itemParaSalvar, id: Date.now() };

      setBeneficios([...beneficios, itemFinal]);
      setNovoBeneficio({ nome: '', tipo: 'Desconto', tipo_valor: 'Valor Fixo', valor: '' });
      toast.success("Benefício salvo!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar benefício.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    if(!window.confirm("Remover este benefício?")) return;
    
    try {
      // Se for ID temporário (criado localmente sem banco), remove só do estado
      if (String(id).length > 10 && !String(id).includes('-')) { 
         setBeneficios(beneficios.filter(b => b.id !== id));
         return;
      }

      await deleteBeneficio(id);
      setBeneficios(beneficios.filter(b => b.id !== id));
      toast.success("Removido.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover.");
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Benefícios e Descontos Fixos</h2>
      
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 bg-gray-50 p-4 rounded border border-gray-200 items-end">
        <div className="md:col-span-4">
          <label className="block text-xs font-bold text-gray-500 uppercase">Nome</label>
          <input 
            name="nome" placeholder="Ex: Plano de Saúde" 
            value={novoBeneficio.nome} onChange={handleChange}
            className="w-full p-2 border rounded text-sm" required
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-gray-500 uppercase">Tipo</label>
          <select name="tipo" value={novoBeneficio.tipo} onChange={handleChange} className="w-full p-2 border rounded text-sm">
            <option value="Desconto">Desconto (-)</option>
            <option value="Provento">Provento (+)</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-bold text-gray-500 uppercase">Valor</label>
          <div className="flex">
             <select name="tipo_valor" value={novoBeneficio.tipo_valor} onChange={handleChange} className="p-2 border rounded-l text-sm bg-gray-100 w-16">
              <option value="Valor Fixo">R$</option>
              <option value="Porcentagem">%</option>
            </select>
            <input 
              name="valor" type="number" step="0.01" placeholder="0.00" 
              value={novoBeneficio.valor} onChange={handleChange}
              className="w-full p-2 border rounded-r text-sm" required
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-2 rounded text-sm font-bold hover:bg-blue-700 transition">
            {loading ? '...' : '+ Adicionar'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b">
            <tr>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {beneficios.map(b => (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{b.nome}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    b.tipo === 'Desconto' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {b.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {b.tipo_valor === 'Porcentagem' ? `${b.valor}%` : `R$ ${parseFloat(b.valor).toFixed(2)}`}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleRemove(b.id)} className="text-red-500 hover:text-red-700 font-medium text-xs">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {beneficios.length === 0 && (
              <tr>
                <td colSpan="4" className="px-4 py-8 text-center text-gray-400 italic">
                  Nenhum benefício ou desconto fixo cadastrado para este colaborador.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestaoBeneficios;