import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { criarBeneficio, deletarBeneficio } from '../../services/beneficioService';
import './GestaoBeneficios.css';

export default function GestaoBeneficios({ funcionario, beneficios, onUpdate }) {
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    if (!funcionario) return;
    setLoading(true);
    try {
      await criarBeneficio({
        funcionario_id: funcionario.id,
        nome: data.nome,
        tipo: data.tipo,
        valor: parseFloat(data.valor),
        recorrente: true
      });
      toast.success("Item atualizado na folha!");
      reset();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar benefício.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja remover este item da folha?")) return;
    try {
      await deletarBeneficio(id);
      toast.success("Item removido.");
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error("Erro ao remover.");
    }
  };

  const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="gestao-beneficios-container">
      <div className="beneficios-header">
        <h3>Benefícios e Descontos</h3>
        <p>Gerenciando folha de: <strong>{funcionario.nome_completo}</strong></p>
      </div>
      
      {/* Formulário de Adição */}
      <form onSubmit={handleSubmit(onSubmit)} className="form-beneficios">
        <div className="form-group">
          <label>Descrição</label>
          <input {...register('nome')} placeholder="Ex: Vale Refeição, Plano de Saúde..." required />
        </div>
        
        <div className="form-group">
          <label>Tipo</label>
          <select {...register('tipo')}>
            <option value="Desconto">Desconto (-)</option>
            <option value="Provento">Provento (+)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Valor (R$)</label>
          <input type="number" step="0.01" {...register('valor')} required placeholder="0,00" />
        </div>

        <button type="submit" className="btn-add" disabled={loading}>
          {loading ? 'Salvando...' : 'Adicionar Item'}
        </button>
      </form>

      {/* Tabela de Itens */}
      <div className="tabela-beneficios-wrapper">
        <table className="tabela-beneficios">
          <thead>
            <tr>
              <th>Item</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th align="center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {beneficios.length === 0 && (
              <tr><td colSpan="4" className="empty-msg">Nenhum item extra cadastrado.</td></tr>
            )}
            {beneficios.map(ben => (
              <tr key={ben.id}>
                <td>{ben.nome}</td>
                <td>
                  <span className={`tag ${ben.tipo === 'Provento' ? 'tag-green' : 'tag-red'}`}>
                    {ben.tipo}
                  </span>
                </td>
                <td className={`font-bold ${ben.tipo === 'Provento' ? 'text-green' : 'text-red'}`}>
                  {ben.tipo === 'Desconto' ? '- ' : '+ '}{formatMoney(ben.valor)}
                </td>
                <td align="center">
                  <button type="button" onClick={() => handleDelete(ben.id)} className="btn-delete" title="Remover">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}