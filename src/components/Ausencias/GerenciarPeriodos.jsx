import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionarios } from '../../services/funcionarioService';
import { getPeriodosAquisitivos, updatePeriodoAquisitivo } from '../../services/ausenciaService';

function GerenciarPeriodos({ onClose }) {
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  
  // Busca lista de funcionários para o dropdown
  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // Busca períodos quando um funcionário é selecionado
  useEffect(() => {
    if (selectedFuncionario) {
      carregarPeriodos(selectedFuncionario);
    } else {
      setPeriodos([]);
    }
  }, [selectedFuncionario]);

  const carregarPeriodos = async (funcionarioId) => {
    setLoadingPeriodos(true);
    try {
      const data = await getPeriodosAquisitivos(funcionarioId);
      setPeriodos(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao buscar períodos.');
    } finally {
      setLoadingPeriodos(false);
    }
  };

  // Ação: Atualizar Saldo Manualmente
  const handleUpdateSaldo = async (periodoId, diasGozadosAtuais) => {
    // Prompt simples para o gestor inserir o valor corrigido
    const novoValor = prompt("Informe o total de dias JÁ GOZADOS neste período (0 a 30):", diasGozadosAtuais);
    
    if (novoValor === null) return; // Cancelou
    
    const dias = parseInt(novoValor);
    if (isNaN(dias) || dias < 0 || dias > 30) {
      toast.error("Valor inválido. Insira um número entre 0 e 30.");
      return;
    }

    try {
      await updatePeriodoAquisitivo(periodoId, { 
        dias_gozados: dias,
        // Se gozou 30 dias, o período é considerado fechado automaticamente
        status: dias >= 30 ? 'Fechado' : 'Aberto' 
      });
      
      toast.success("Saldo atualizado com sucesso!");
      carregarPeriodos(selectedFuncionario); // Recarrega a lista
    } catch (error) {
      toast.error("Erro ao atualizar o período.");
    }
  };

  // Ação: Quitar Período (Zerar saldo e fechar)
  const handleQuitar = async (periodoId) => {
    if (!window.confirm("Tem certeza? Isso marcará o período como totalmente gozado (30 dias) e o fechará.")) return;

    try {
      await updatePeriodoAquisitivo(periodoId, { 
        dias_gozados: 30,
        status: 'Fechado'
      });
      
      toast.success("Período quitado e fechado!");
      carregarPeriodos(selectedFuncionario);
    } catch (error) {
      toast.error("Erro ao quitar o período.");
    }
  };

  return (
    <div style={{padding: '0 4px'}}>
      
      {/* Seletor de Funcionário */}
      <div style={{marginBottom: '24px'}}>
        <label style={{display: 'block', marginBottom: '8px', fontWeight: 600, color: '#4a5568'}}>
          Selecione o Colaborador:
        </label>
        <select 
          style={{width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '1rem'}}
          value={selectedFuncionario}
          onChange={(e) => setSelectedFuncionario(e.target.value)}
        >
          <option value="">-- Selecione --</option>
          {funcionarios?.map(f => (
            <option key={f.id} value={f.id}>{f.nome_completo}</option>
          ))}
        </select>
      </div>

      {/* Estado de Carregamento */}
      {loadingPeriodos && (
        <div style={{textAlign: 'center', padding: '20px', color: '#718096'}}>Carregando histórico...</div>
      )}
      
      {/* Lista de Períodos */}
      {!loadingPeriodos && periodos.length > 0 && (
        <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
          {periodos.map(p => {
            const inicio = new Date(p.inicio_periodo).toLocaleDateString('pt-BR');
            const fim = new Date(p.fim_periodo).toLocaleDateString('pt-BR');
            const limite = new Date(p.limite_concessivo).toLocaleDateString('pt-BR');
            
            const isFechado = p.status === 'Fechado' || p.saldo_atual <= 0;

            return (
              <div key={p.id} style={{
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                padding: '16px',
                backgroundColor: isFechado ? '#f8fafc' : '#fff',
                position: 'relative'
              }}>
                {/* Cabeçalho do Card */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                  <div>
                    <strong style={{color: '#1e293b', fontSize: '1rem'}}>
                      Período: {inicio} a {fim}
                    </strong>
                    <div style={{fontSize: '0.85rem', color: '#64748b', marginTop: '4px'}}>
                      Limite para gozo: {limite}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                    background: isFechado ? '#e2e8f0' : '#dcfce7', 
                    color: isFechado ? '#64748b' : '#166534'
                  }}>
                    {isFechado ? 'Fechado' : 'Aberto'}
                  </span>
                </div>

                {/* Dados Numéricos */}
                <div style={{
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr', 
                  gap: '8px', 
                  background: isFechado ? 'transparent' : '#f0f9ff', 
                  padding: isFechado ? '0' : '10px', 
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase'}}>Direito</span>
                    <span style={{fontWeight: 600, color: '#334155'}}>{p.dias_direito} dias</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase'}}>Gozados</span>
                    <span style={{fontWeight: 600, color: '#334155'}}>{p.dias_gozados} dias</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column'}}>
                    <span style={{fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase'}}>Saldo</span>
                    <span style={{fontWeight: 700, color: isFechado ? '#64748b' : '#0369a1', fontSize: '1.1rem'}}>
                      {p.saldo_atual}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação (Só aparecem se estiver aberto) */}
                {!isFechado && (
                  <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px dashed #e2e8f0', paddingTop: '12px'}}>
                    <button 
                      onClick={() => handleUpdateSaldo(p.id, p.dias_gozados)}
                      style={{
                        background: '#fff', border: '1px solid #cbd5e0', padding: '8px 12px', 
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569', fontWeight: 500
                      }}
                    >
                      Corrigir Saldo
                    </button>
                    <button 
                      onClick={() => handleQuitar(p.id)}
                      style={{
                        background: '#fff1f2', border: '1px solid #fecaca', padding: '8px 12px', 
                        borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#b91c1c', fontWeight: 500
                      }}
                    >
                      Quitar (Zerar)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mensagem Vazia */}
      {!loadingPeriodos && selectedFuncionario && periodos.length === 0 && (
        <div style={{textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '8px', color: '#64748b'}}>
          <p>Nenhum período aquisitivo encontrado para este colaborador.</p>
          <small>Verifique se a data de admissão foi cadastrada corretamente.</small>
        </div>
      )}

      {/* Rodapé */}
      <div style={{marginTop: '32px', display: 'flex', justifyContent: 'flex-end'}}>
        <button 
          onClick={onClose} 
          style={{
            padding: '10px 20px', background: '#f1f5f9', border: '1px solid #cbd5e0', 
            borderRadius: '6px', cursor: 'pointer', fontWeight: 600, color: '#334155'
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export default GerenciarPeriodos;