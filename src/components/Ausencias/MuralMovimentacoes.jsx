import React, { useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { getMuralRecente, deleteAusenciaSegura, deleteCreditoSeguro } from '../../services/ausenciaService';
import { toast } from 'react-hot-toast';
import { getAvatarPublicUrl } from '../../services/funcionarioService';
import './MuralMovimentacoes.css';

function MuralMovimentacoes({ onEditar }) {
  const { mutate } = useSWRConfig();
  const { data, isLoading } = useSWR('getMuralRecente', getMuralRecente);

  const listaMural = useMemo(() => {
    if (!data) return [];
    const { ausencias, creditos, periodos } = data;
    
    // 1. Ausências (Dia a dia)
    const listaAusencias = ausencias.map(a => ({ 
      ...a, 
      id_real: a.id,
      tipo_item: 'debito', 
      data_referencia: a.data_inicio,
      ordem: a.created_at, // Ordena pelo momento da criação
      titulo: a.tipo,
      status: a.status 
    }));

    // 2. Créditos (Banco/Folga)
    const listaCreditos = creditos.map(c => ({ 
      ...c, 
      id_real: c.id,
      tipo_item: 'credito', 
      data_referencia: c.data_lancamento, 
      ordem: c.created_at,
      titulo: `Crédito: ${c.tipo}`,
      status: 'Concluído'
    }));

    // 3. Períodos (Direito de Férias)
    const listaPeriodos = (periodos || []).map(p => ({
      ...p,
      id_real: p.id,
      tipo_item: 'credito', // Comportamento de crédito
      data_referencia: p.inicio_periodo,
      ordem: p.created_at,
      titulo: 'Novo Período Aquisitivo',
      status: 'Ativo',
      tipo: 'Férias',
      quantidade: p.dias_direito,
      unidade: 'dias'
    }));

    // Unifica e ordena pelo Created_At (o que acabei de fazer aparece em cima)
    const lista = [...listaAusencias, ...listaCreditos, ...listaPeriodos];
    return lista.sort((a, b) => new Date(b.ordem) - new Date(a.ordem));
  }, [data]);

  const handleDelete = async (item) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    const toastId = toast.loading("Processando...");
    try {
      // Se for período ou crédito, usa a função de crédito seguro
      if (item.tipo_item === 'credito' || item.titulo === 'Novo Período Aquisitivo') {
        await deleteCreditoSeguro(item.id_real);
      } else {
        await deleteAusenciaSegura(item.id_real);
      }
      toast.success("Registro excluído.", { id: toastId });
      // Atualiza tudo
      mutate('getMuralRecente');
      mutate('getSaldosConsolidados');
      mutate(key => Array.isArray(key) && key[0] === 'ferias');
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };

  if (isLoading) return <div className="loading-state">Carregando mural...</div>;

  return (
    <div className="mural-grid">
      {listaMural.length === 0 && <p className="empty-state">Nenhum lançamento recente.</p>}
      
      {listaMural.map(item => (
        <div key={item.id_real} className={`mural-card ${item.status === 'Concluído' ? 'locked' : ''}`}>
          <div className="card-header">
             <span className={`pill ${item.status}`}>{item.status}</span>
             
             <div className="card-actions">
               {(item.status === 'Pendente' || new Date(item.ordem) > new Date(Date.now() - 86400000)) && (
                 <>
                   {item.status === 'Pendente' && (
                     <button onClick={() => onEditar(item.id_real, item.tipo_item)} title="Editar"><span className="material-symbols-outlined">edit</span></button>
                   )}
                   <button onClick={() => handleDelete(item)} title="Excluir Recente"><span className="material-symbols-outlined">delete</span></button>
                 </>
               )}
               {item.status !== 'Pendente' && new Date(item.ordem) <= new Date(Date.now() - 86400000) && (
                 <span className="material-symbols-outlined icon-lock" title="Registro consolidado">lock</span>
               )}
             </div>
          </div>
          
          <div className="card-body">
            <img 
              src={getAvatarPublicUrl(item.funcionarios?.avatar_url) || `https://ui-avatars.com/api/?name=${item.funcionarios?.nome_completo}`} 
              className="avatar" 
              alt="Avatar"
            />
            <div>
              <strong>{item.funcionarios?.nome_completo}</strong>
              <p className="card-desc">{item.titulo}</p>
              {item.quantidade > 0 && (
                <span className="card-value">
                  {item.tipo_item === 'credito' ? '+' : ''}{item.quantidade} {item.unidade}
                </span>
              )}
            </div>
          </div>
          
          <div className="card-footer">
             <small>Ref: {new Date(item.data_referencia).toLocaleDateString('pt-BR')}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MuralMovimentacoes;