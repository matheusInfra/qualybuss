// src/pages/MovimentacoesPage.jsx
import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';

// Importa os services corretos
import { getFuncionarios } from '../services/funcionarioService';
import { createMovimentacao, getTodasMovimentacoes } from '../services/movimentacaoService';

// Reutiliza o CSS de outros formulários e listas
import '../components/Ausencias/LancarAusenciaForm.css';
import '../components/Ausencias/HistoricoAusencias.css';

// Estado inicial com os nomes corretos das colunas
const initialState = {
  id_funcionario: '', // <-- CORRIGIDO
  data_movimentacao: new Date().toISOString().split('T')[0],
  tipo: 'Promoção',
  descricao: '',
  cargo_anterior: '', // <-- CORRIGIDO
  cargo_novo: '',     // <-- CORRIGIDO
  salario_anterior: '', // <-- CORRIGIDO
  salario_novo: '',   // <-- CORRIGIDO
};

// --- Componente de Histórico (embutido) ---
function HistoricoMovimentacoes() {
  const cacheKey = 'todasMovimentacoes';
  const { data: movimentacoes, error, isLoading } = useSWR(cacheKey, getTodasMovimentacoes);

  if (isLoading) return <p>Carregando histórico...</p>;
  if (error) return <p className="error-message">Erro ao carregar histórico: {error.message}</p>;
  if (!movimentacoes || movimentacoes.length === 0) {
    return <p>Nenhum lançamento encontrado.</p>;
  }

  // Helper para formatar R$
  const formatCurrency = (val) => val ? `R$ ${parseFloat(val).toFixed(2)}` : 'N/A';

  return (
    <table className="historico-table">
      <thead>
        <tr>
          <th>Colaborador</th>
          <th>Data</th>
          <th>Tipo</th>
          <th>Descrição</th>
          <th>Cargo (Antigo → Novo)</th>
          <th>Salário (Antigo → Novo)</th>
        </tr>
      </thead>
      <tbody>
        {movimentacoes.map(mov => {
          // O 'join' corrigido agora renomeia 'id_funcionario' para 'funcionarios'
          const func = mov.funcionarios; 
          return (
            <tr key={mov.id}>
              <td>
                <div className="colaborador-cell">
                  <span className="colaborador-nome">{func?.nome_completo || '(?)'}</span>
                </div>
              </td>
              <td>{new Date(mov.data_movimentacao.replace(/-/g, '/')).toLocaleDateString('pt-BR')}</td>
              <td><span className="tipo-pill">{mov.tipo}</span></td>
              <td>{mov.descricao}</td>
              {/* Coluna de Cargo */}
              <td>
                {mov.cargo_anterior || mov.cargo_novo
                  ? `${mov.cargo_anterior || 'N/A'} → ${mov.cargo_novo || 'N/A'}`
                  : 'N/A'}
              </td>
              {/* Coluna de Salário */}
              <td>
                {mov.salario_anterior || mov.salario_novo
                  ? `${formatCurrency(mov.salario_anterior)} → ${formatCurrency(mov.salario_novo)}`
                  : 'N/A'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// --- Componente Principal da Página ---
function MovimentacoesPage() {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useSWRConfig();

  const { data: funcionarios, isLoading: isLoadingFunc } = useSWR('getFuncionarios', getFuncionarios);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_funcionario || !formData.tipo || !formData.data_movimentacao || !formData.descricao) {
      toast.error("Preencha funcionário, data, tipo e descrição.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepara os dados com 'null' se estiverem vazios
      const novosDados = {
        ...formData,
        cargo_anterior: formData.cargo_anterior || null,
        cargo_novo: formData.cargo_novo || null,
        salario_anterior: formData.salario_anterior || null,
        salario_novo: formData.salario_novo || null,
      };
      
      const novaMovimentacao = await createMovimentacao(novosDados);

      // Mutação Otimista
      mutate('todasMovimentacoes', (dadosAntigos = []) => {
        const funcInfo = funcionarios.find(f => f.id === novaMovimentacao.id_funcionario);
        const itemCompleto = {
          ...novaMovimentacao,
          // Cria o objeto 'funcionarios' manualmente para a UI
          funcionarios: {
            nome_completo: funcInfo?.nome_completo || '?',
            avatar_url: funcInfo?.avatar_url || null
          }
        };
        return [itemCompleto, ...dadosAntigos];
      }, { revalidate: false });

      toast.success('Movimentação registrada!');
      setFormData(initialState); // Limpa o formulário

    } catch (err) {
      toast.error(`Erro ao salvar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ausencias-container">
      <h1>Gestão de Movimentações</h1>
      <p>Registre promoções, reajustes salariais e transferências.</p>

      {/* --- Formulário de Criação (Corrigido) --- */}
      <div className="ausencia-form-container" style={{marginBottom: '32px'}}>
        <form onSubmit={handleSubmit}>
          <div className="ausencia-form-content">
            {/* Grid com 4 colunas para caber tudo */}
            <div className="ausencia-form-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
              {/* Colaborador */}
              <div className="ausencia-form-group ausencia-form-span-2">
                <label>Colaborador *</label>
                <select 
                  name="id_funcionario" // <-- CORRIGIDO
                  value={formData.id_funcionario} 
                  onChange={handleChange}
                  disabled={isLoadingFunc}
                >
                  <option value="">{isLoadingFunc ? 'Carregando...' : 'Selecione um colaborador'}</option>
                  {funcionarios?.map(f => (
                    <option key={f.id} value={f.id}>{f.nome_completo}</option>
                  ))}
                </select>
              </div>
              {/* Data */}
              <div className="ausencia-form-group">
                <label>Data *</label>
                <input type="date" name="data_movimentacao" value={formData.data_movimentacao} onChange={handleChange} />
              </div>
              {/* Tipo */}
              <div className="ausencia-form-group">
                <label>Tipo *</label>
                <select name="tipo" value={formData.tipo} onChange={handleChange}>
                  <option value="Promoção">Promoção</option>
                  <option value="Ajuste Salarial">Ajuste Salarial</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Advertência">Advertência</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              {/* Descrição */}
              <div className="ausencia-form-group ausencia-form-span-2">
                <label>Descrição *</label>
                <input type="text" name="descricao" placeholder="Ex: Promovido de Analista Jr para Pleno" value={formData.descricao} onChange={handleChange} />
              </div>
              {/* Cargo Anterior */}
              <div className="ausencia-form-group">
                <label>Cargo Anterior</label>
                <input type="text" name="cargo_anterior" value={formData.cargo_anterior} onChange={handleChange} />
              </div>
              {/* Cargo Novo */}
              <div className="ausencia-form-group">
                <label>Cargo Novo</label>
                <input type="text" name="cargo_novo" value={formData.cargo_novo} onChange={handleChange} />
              </div>
              {/* Salário Anterior */}
              <div className="ausencia-form-group">
                <label>Salário Anterior (R$)</label>
                <input type="number" step="0.01" name="salario_anterior" value={formData.salario_anterior} onChange={handleChange} />
              </div>
              {/* Salário Novo */}
              <div className="ausencia-form-group">
                <label>Salário Novo (R$)</label>
                <input type="number" step="0.01" name="salario_novo" value={formData.salario_novo} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="ausencia-form-footer">
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Movimentação'}
            </button>
          </div>
        </form>
      </div>

      {/* --- Histórico Recente --- */}
      <h2>Histórico Recente</h2>
      <div className="historico-container">
        <HistoricoMovimentacoes />
      </div>
    </div>
  );
}

export default MovimentacoesPage;