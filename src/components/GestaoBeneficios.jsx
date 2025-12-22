import React, { useState, useEffect } from 'react';
// Se você tiver um serviço de salvar benefícios, importe aqui.
import { saveBeneficios } from '../services/beneficioService';

const GestaoBeneficios = ({ funcionarioId, dadosIniciais = [] }) => {
  const [beneficios, setBeneficios] = useState(dadosIniciais);
  const [novoBeneficio, setNovoBeneficio] = useState({
    nome: '',
    tipo: 'Desconto', // Padronizado com SalariosPage (Provento/Desconto)
    tipo_valor: 'Valor Fixo', // Valor Fixo ou Porcentagem
    valor: '',
  });

  useEffect(() => {
    // Atualiza se mudar o funcionário selecionado
    if(dadosIniciais) setBeneficios(dadosIniciais);
  }, [funcionarioId, dadosIniciais]);

  const handleChange = (e) => {
    setNovoBeneficio({ ...novoBeneficio, [e.target.name]: e.target.value });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!novoBeneficio.nome || !novoBeneficio.valor) return;

    const item = {
      id: Date.now(),
      funcionario_id: funcionarioId,
      ...novoBeneficio,
      valor: parseFloat(novoBeneficio.valor)
    };

    const novaLista = [...beneficios, item];
    setBeneficios(novaLista);
    setNovoBeneficio({ nome: '', tipo: 'Desconto', tipo_valor: 'Valor Fixo', valor: '' });
    
    // AQUI VOCÊ CHAMARIA O SERVIÇO PARA SALVAR NO BANCO
    // saveBeneficios(item);
    console.log("Salvar no banco:", item);
  };

  const handleRemove = (id) => {
    setBeneficios(beneficios.filter(b => b.id !== id));
    // deleteBeneficio(id);
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-bold mb-4">Gerenciar Benefícios Individuais</h2>
      
      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded border">
        <input 
          name="nome" placeholder="Nome (ex: Plano Saúde)" 
          value={novoBeneficio.nome} onChange={handleChange}
          className="p-2 border rounded" required
        />
        <select name="tipo" value={novoBeneficio.tipo} onChange={handleChange} className="p-2 border rounded">
          <option value="Desconto">Desconto (-)</option>
          <option value="Provento">Provento (+)</option>
        </select>
        <div className="flex gap-2">
           <select name="tipo_valor" value={novoBeneficio.tipo_valor} onChange={handleChange} className="p-2 border rounded w-1/2">
            <option value="Valor Fixo">R$</option>
            <option value="Porcentagem">%</option>
          </select>
          <input 
            name="valor" type="number" step="0.01" placeholder="Valor" 
            value={novoBeneficio.valor} onChange={handleChange}
            className="p-2 border rounded w-1/2" required
          />
        </div>
        <button type="submit" className="bg-green-600 text-white rounded hover:bg-green-700">Adicionar</button>
      </form>

      <table className="w-full">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="pb-2">Nome</th>
            <th className="pb-2">Tipo</th>
            <th className="pb-2">Valor</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {beneficios.map(b => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="py-3">{b.nome}</td>
              <td className="py-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${b.tipo === 'Desconto' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {b.tipo}
                </span>
              </td>
              <td className="py-3 font-mono">
                {b.tipo_valor === 'Porcentagem' ? `${b.valor}%` : `R$ ${parseFloat(b.valor).toFixed(2)}`}
              </td>
              <td className="py-3 text-right">
                <button onClick={() => handleRemove(b.id)} className="text-red-500 hover:text-red-700 text-sm">Remover</button>
              </td>
            </tr>
          ))}
          {beneficios.length === 0 && <tr><td colSpan="4" className="py-4 text-center text-gray-400">Nenhum benefício cadastrado.</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default GestaoBeneficios;