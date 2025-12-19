import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { criarBeneficio, deletarBeneficio } from '../../services/beneficioService';
import './GestaoBeneficios.css';

export default function GestaoBeneficios({ funcionario, beneficios, onUpdate }) {
  const { register, handleSubmit, reset, watch } = useForm();
  const [loading, setLoading] = useState(false);
  
  // Observa o tipo para mudar o placeholder do input dinamicamente
  const tipoValorSelecionado = watch('tipo_valor', 'Fixo');

  const onSubmit = async (data) => {
    if (!funcionario) return;
    setLoading(true);
    try {
      await criarBeneficio({
        funcionario_id: funcionario.id,
        nome: data.nome,
        tipo: data.tipo,
        tipo_valor: data.tipo_valor, // Novo campo: 'Fixo' ou 'Porcentagem'
        valor: parseFloat(data.valor),
        descricao: data.descricao,   // Novo campo: Descrição opcional
        recorrente: true
      });
      toast.success("Benefício adicionado com sucesso!");
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
    if (!window.confirm("Tem certeza que deseja remover este item?")) return;
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
    <div className="gestao-beneficios-container fade-in">
      <div className="beneficios-header-row">
        <div>
          <h3>Gestão de Benefícios & Descontos</h3>
          <p>Configuração contratual para: <strong>{funcionario.nome_completo}</strong></p>
        </div>
        <div className="salario-badge">
          Salário Base: <strong>{formatMoney(funcionario.salario_bruto)}</strong>
        </div>
      </div>
      
      {/* Formulário Estilizado */}
      <form onSubmit={handleSubmit(onSubmit)} className="card-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Nome do Item</label>
            <input {...register('nome')} placeholder="Ex: Vale Transporte, Plano Saúde..." required />
          </div>
          
          <div className="form-group">
            <label>Tipo de Lançamento</label>
            <select {...register('tipo')}>
              <option value="Desconto">🔴 Desconto (Deduz do Salário)</option>
              <option value="Provento">🟢 Provento (Soma ao Salário)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Modo de Cálculo</label>
            <select {...register('tipo_valor')}>
              <option value="Fixo">R$ Valor Fixo</option>
              <option value="Porcentagem">% Porcentagem do Salário</option>
            </select>
          </div>

          <div className="form-group">
            <label>{tipoValorSelecionado === 'Fixo' ? 'Valor (R$)' : 'Porcentagem (%)'}</label>
            <input 
              type="number" step="0.01" {...register('valor')} required 
              placeholder={tipoValorSelecionado === 'Fixo' ? '0,00' : 'Ex: 6 para 6%'} 
            />
          </div>
        </div>
        
        <div className="form-group full-width">
          <label>Descrição / Observação (Opcional)</label>
          <input {...register('descricao')} placeholder="Detalhes adicionais (ex: Desconto de 6% conf. lei)" />
        </div>

        <button type="submit" className="btn-add-card" disabled={loading}>
          {loading ? 'Salvando...' : '+ Adicionar Item'}
        </button>
      </form>

      <div className="divider"><span>Itens Cadastrados</span></div>

      {/* Grid de Cards Visual */}
      <div className="cards-grid">
        {beneficios.length === 0 && (
          <div className="empty-cards">
            <span className="material-symbols-outlined">post_add</span>
            <p>Nenhum benefício ou desconto fixo cadastrado.</p>
          </div>
        )}

        {beneficios.map(ben => {
          // Calcula o valor estimado para exibição no card
          const valorCalculado = ben.tipo_valor === 'Porcentagem' 
            ? (Number(funcionario.salario_bruto) * (Number(ben.valor) / 100)) 
            : Number(ben.valor);

          return (
            <div key={ben.id} className={`benefit-card ${ben.tipo === 'Desconto' ? 'card-desconto' : 'card-provento'}`}>
              <div className="card-top">
                <span className="card-icon material-symbols-outlined">
                  {ben.tipo === 'Desconto' ? 'trending_down' : 'trending_up'}
                </span>
                <button onClick={() => handleDelete(ben.id)} className="btn-trash" title="Excluir">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
              
              <h4 title={ben.nome}>{ben.nome}</h4>
              <p className="card-desc">{ben.descricao || ben.tipo}</p>
              
              <div className="card-values">
                <div className="main-value">
                  {ben.tipo_valor === 'Porcentagem' ? `${ben.valor}%` : formatMoney(ben.valor)}
                </div>
                {ben.tipo_valor === 'Porcentagem' && (
                  <small className="sub-value">≈ {formatMoney(valorCalculado)}/mês</small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}