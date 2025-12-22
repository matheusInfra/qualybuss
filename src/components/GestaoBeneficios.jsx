// src/components/GestaoBeneficios.jsx
import React, { useState } from 'react';

const GestaoBeneficios = () => {
  // Lista inicial de dados (pode vir de API futuramente)
  const [listaBeneficios, setListaBeneficios] = useState([
    { id: 1, nome: 'Vale Transporte', tipo: 'Desconto', valor: '6%', descricao: 'Lei vigente' },
    { id: 2, nome: 'Vale Alimentação', tipo: 'Benefício', valor: 'R$ 600,00', descricao: 'Mensal' }
  ]);

  const [novoItem, setNovoItem] = useState({
    nome: '',
    tipo: 'Benefício',
    valor: '',
    descricao: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNovoItem(prev => ({ ...prev, [name]: value }));
  };

  const adicionarBeneficio = (e) => {
    e.preventDefault();
    if (!novoItem.nome || !novoItem.valor) return;

    const itemParaSalvar = {
      id: Date.now(),
      ...novoItem
    };

    setListaBeneficios([...listaBeneficios, itemParaSalvar]);
    setNovoItem({ nome: '', tipo: 'Benefício', valor: '', descricao: '' });
  };

  const removerBeneficio = (id) => {
    setListaBeneficios(listaBeneficios.filter(item => item.id !== id));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-gray-800">Catálogo de Benefícios</h2>

      {/* Formulário Rápido */}
      <form onSubmit={adicionarBeneficio} className="mb-6 bg-gray-50 p-3 rounded border border-gray-200">
        <h3 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wide">Adicionar Novo</h3>
        <div className="grid grid-cols-1 gap-3">
          <input
            type="text"
            name="nome"
            placeholder="Nome do Benefício (ex: GymPass)"
            value={novoItem.nome}
            onChange={handleChange}
            className="w-full p-2 border rounded text-sm"
          />
          <div className="flex gap-2">
            <select 
              name="tipo" 
              value={novoItem.tipo} 
              onChange={handleChange}
              className="p-2 border rounded text-sm flex-1"
            >
              <option value="Benefício">Crédito (Benefício)</option>
              <option value="Desconto">Débito (Desconto)</option>
            </select>
            <input
              type="text"
              name="valor"
              placeholder="Valor (R$ ou %)"
              value={novoItem.valor}
              onChange={handleChange}
              className="w-full p-2 border rounded text-sm flex-1"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-1.5 rounded text-sm font-medium transition"
          >
            + Adicionar
          </button>
        </div>
      </form>

      {/* Lista de Visualização */}
      <div className="overflow-y-auto max-h-[400px]">
        {listaBeneficios.length === 0 ? (
          <p className="text-gray-500 text-center text-sm py-4">Nenhum benefício cadastrado.</p>
        ) : (
          <ul className="space-y-3">
            {listaBeneficios.map((beneficio) => (
              <li key={beneficio.id} className="flex justify-between items-center p-3 border rounded hover:shadow-sm transition bg-white">
                <div>
                  <p className="font-bold text-gray-800">{beneficio.nome}</p>
                  <p className="text-xs text-gray-500">{beneficio.descricao}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    beneficio.tipo === 'Desconto' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {beneficio.tipo}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{beneficio.valor}</p>
                  <button 
                    onClick={() => removerBeneficio(beneficio.id)}
                    className="text-xs text-red-500 hover:text-red-700 underline mt-1"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default GestaoBeneficios;