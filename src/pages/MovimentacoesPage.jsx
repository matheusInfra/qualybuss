// src/pages/MovimentacoesPage.jsx
import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';

// Services
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { createMovimentacao, getTodasMovimentacoes } from '../services/movimentacaoService';

// Componentes
import ModalReajusteMassa from '../components/Modal/ModalReajusteMassa'; // Certifique-se de ter este componente

// Estilos
import '../components/Ausencias/LancarAusenciaForm.css';
import '../components/Ausencias/HistoricoAusencias.css';

const initialState = {
  id_funcionario: '',
  data_movimentacao: new Date().toISOString().split('T')[0],
  tipo: 'Promoção',
  descricao: '',
  // Campos de Cargo/Salário
  cargo_anterior: '',
  cargo_novo: '',
  salario_anterior: '',
  salario_novo: '',
  // Campos de Transferência
  empresa_anterior: '',
  empresa_nova: '',
  departamento_anterior: '',
  departamento_novo: ''
};

function HistoricoMovimentacoes() {
  const cacheKey = 'todasMovimentacoes';
  const { data: movimentacoes, error, isLoading } = useSWR(cacheKey, getTodasMovimentacoes);

  if (isLoading) return <p style={{textAlign:'center', color:'#64748b', padding:20}}>Carregando histórico...</p>;
  if (error) return <p className="error-message">Erro: {error.message}</p>;
  if (!movimentacoes || movimentacoes.length === 0) {
    return <div className="empty-state">Nenhuma movimentação registrada.</div>;
  }

  const formatCurrency = (val) => val ? `R$ ${parseFloat(val).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-';

  return (
    <div className="tabela-container">
      <table className="historico-table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Detalhes da Mudança</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoes.map(mov => {
            const func = mov.funcionarios; 
            
            let detalhes = mov.descricao;
            if (mov.tipo === 'Promoção' || mov.tipo.includes('Cargo')) {
               detalhes = `${mov.cargo_anterior || '?'} ➝ ${mov.cargo_novo || '?'}`;
            } else if (mov.tipo.includes('Salarial') || mov.tipo.includes('Reajuste')) {
               detalhes = `${formatCurrency(mov.salario_anterior)} ➝ ${formatCurrency(mov.salario_novo)}`;
            } else if (mov.tipo === 'Transferência') {
               detalhes = `${mov.departamento_anterior || 'Dep. Antigo'} ➝ ${mov.departamento_novo || 'Novo'}`;
            }

            return (
              <tr key={mov.id}>
                <td>
                  <div className="colaborador-cell">
                    {func?.avatar_url && (
                      <img src={func.avatar_url} alt="" style={{width:24, height:24, borderRadius:'50%', objectFit:'cover', marginRight:8}} />
                    )}
                    <span className="colaborador-nome">{func?.nome_completo || 'Desconhecido'}</span>
                  </div>
                </td>
                <td>{new Date(mov.data_movimentacao.replace(/-/g, '/')).toLocaleDateString('pt-BR')}</td>
                <td><span className="tipo-pill">{mov.tipo}</span></td>
                <td>
                  <div style={{display:'flex', flexDirection:'column'}}>
                    <span style={{fontWeight:500}}>{detalhes}</span>
                    <span style={{fontSize:'0.75rem', color:'#64748b'}}>{mov.descricao}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MovimentacoesPage() {
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalReajusteOpen, setIsModalReajusteOpen] = useState(false);
  const { mutate } = useSWRConfig();

  // Data Fetching
  const { data: funcionarios, isLoading: isLoadingFunc } = useSWR('getFuncionarios', getFuncionarios);
  const { data: empresas } = useSWR('getEmpresas', getEmpresas); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Auto-preencher dados atuais
    if (name === 'id_funcionario') {
        const func = funcionarios?.find(f => f.id === value);
        if (func) {
            setFormData(prev => ({
                ...prev,
                cargo_anterior: func.cargo || '',
                salario_anterior: func.salario_bruto || '',
                departamento_anterior: func.departamento || '',
                empresa_anterior: func.empresa_id || ''
            }));
        }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_funcionario || !formData.tipo || !formData.data_movimentacao) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const novosDados = { ...formData };
      // Limpa campos vazios
      Object.keys(novosDados).forEach(key => {
        if (novosDados[key] === '') novosDados[key] = null;
      });
      
      await createMovimentacao(novosDados);

      mutate('todasMovimentacoes');
      mutate('getFuncionarios');
      mutate('dashboard_kpis');

      toast.success('Movimentação registrada com sucesso!');
      setFormData(initialState); 

    } catch (err) {
      toast.error(`Erro ao processar: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderização Condicional
  const renderCamposDinamicos = () => {
    const tipo = formData.tipo;
    if (['Promoção', 'Reclassificação', 'Outro'].includes(tipo)) {
      return (
        <>
          <div className="ausencia-form-group">
            <label>Cargo Anterior</label>
            <input type="text" value={formData.cargo_anterior} disabled className="input-disabled" />
          </div>
          <div className="ausencia-form-group">
            <label style={{color: '#2563eb', fontWeight: 'bold'}}>Novo Cargo</label>
            <input type="text" name="cargo_novo" value={formData.cargo_novo} onChange={handleChange} placeholder="Novo cargo..." />
          </div>
        </>
      );
    }
    return null;
  };

  const renderCamposSalario = () => {
    const tipo = formData.tipo;
    if (['Ajuste Salarial', 'Promoção', 'Mérito'].includes(tipo)) {
      return (
        <>
          <div className="ausencia-form-group">
            <label>Salário Anterior (R$)</label>
            <input type="number" value={formData.salario_anterior} disabled className="input-disabled" />
          </div>
          <div className="ausencia-form-group">
            <label style={{color: '#2563eb', fontWeight: 'bold'}}>Novo Salário (R$)</label>
            <input type="number" step="0.01" name="salario_novo" value={formData.salario_novo} onChange={handleChange} placeholder="0.00" />
          </div>
        </>
      );
    }
    return null;
  };

  const renderCamposTransferencia = () => {
    const tipo = formData.tipo;
    if (['Transferência'].includes(tipo)) {
      return (
        <>
          <div className="ausencia-form-group">
            <label>Departamento Atual</label>
            <input type="text" value={formData.departamento_anterior} disabled className="input-disabled" />
          </div>
          <div className="ausencia-form-group">
            <label style={{color: '#2563eb', fontWeight: 'bold'}}>Novo Departamento</label>
            <input type="text" name="departamento_novo" value={formData.departamento_novo} onChange={handleChange} placeholder="Novo departamento..." />
          </div>

          <div className="ausencia-form-group">
            <label>Empresa Atual</label>
            <input type="text" value={empresas?.find(e => e.id === formData.empresa_anterior)?.nome_fantasia || 'Atual'} disabled className="input-disabled" />
          </div>
          <div className="ausencia-form-group">
            <label style={{color: '#2563eb', fontWeight: 'bold'}}>Nova Empresa</label>
            <select name="empresa_nova" value={formData.empresa_nova} onChange={handleChange}>
              <option value="">Selecione...</option>
              {empresas?.map(e => (
                <option key={e.id} value={e.id}>{e.nome_fantasia}</option>
              ))}
            </select>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="ausencias-container">
      <div className="ausencias-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 className="page-title">Gestão de Movimentações</h1>
          <p className="page-subtitle">Registre promoções, alterações e transferências.</p>
        </div>
        
        <button 
          className="button-primary" 
          style={{background: '#7c3aed', borderColor: '#6d28d9'}}
          onClick={() => setIsModalReajusteOpen(true)}
        >
          <span className="material-symbols-outlined" style={{marginRight: 5, fontSize: 18}}>group_add</span>
          Reajuste em Massa / Dissídio
        </button>
      </div>

      <div className="ausencia-form-container" style={{marginBottom: '32px'}}>
        <form onSubmit={handleSubmit}>
          <div className="ausencia-form-content">
            <div className="ausencia-form-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)'}}>
              
              <div className="ausencia-form-group ausencia-form-span-2">
                <label>Colaborador *</label>
                <select 
                  name="id_funcionario" 
                  value={formData.id_funcionario} 
                  onChange={handleChange}
                  disabled={isLoadingFunc}
                  required
                >
                  <option value="">{isLoadingFunc ? 'Carregando...' : 'Selecione um colaborador'}</option>
                  {funcionarios?.map(f => (
                    <option key={f.id} value={f.id}>{f.nome_completo}</option>
                  ))}
                </select>
              </div>

              <div className="ausencia-form-group">
                <label>Data Efetiva *</label>
                <input type="date" name="data_movimentacao" value={formData.data_movimentacao} onChange={handleChange} required />
              </div>

              <div className="ausencia-form-group">
                <label>Tipo de Ação *</label>
                <select name="tipo" value={formData.tipo} onChange={handleChange} required style={{borderColor: '#2563eb', backgroundColor: '#eff6ff'}}>
                  <option value="Promoção">Promoção (Cargo + Salário)</option>
                  <option value="Ajuste Salarial">Ajuste Salarial (Dissídio/Mérito)</option>
                  <option value="Transferência">Transferência (Depto/Empresa)</option>
                  <option value="Reclassificação">Reclassificação (Troca de Cargo)</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="ausencia-form-group ausencia-form-span-4">
                <label>Justificativa / Observação *</label>
                <input type="text" name="descricao" placeholder="Ex: Promoção por mérito..." value={formData.descricao} onChange={handleChange} required />
              </div>

              <div style={{gridColumn: 'span 4', borderTop: '1px dashed #e2e8f0', margin: '10px 0'}}></div>
              
              {renderCamposTransferencia()}
              {renderCamposDinamicos()}
              {renderCamposSalario()}

            </div>
          </div>
          <div className="ausencia-form-footer">
            <button type="submit" className="button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Processando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>

      <h2 style={{fontSize: '1.2rem', color: '#1e293b', marginBottom: '16px'}}>Histórico de Alterações</h2>
      <HistoricoMovimentacoes />

      {/* Modal de Reajuste em Massa */}
      {isModalReajusteOpen && (
        <ModalReajusteMassa onClose={() => setIsModalReajusteOpen(false)} />
      )}
    </div>
  );
}

export default MovimentacoesPage;