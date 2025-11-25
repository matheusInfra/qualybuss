// src/components/Ausencias/MuralMovimentacoes.jsx
import React, { useMemo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { getMuralRecente, deleteAusenciaSegura, deleteCreditoSeguro } from '../../services/ausenciaService'; // NOVAS FUNÇÕES
import { toast } from 'react-hot-toast';
import './MuralMovimentacoes.css';

// ... Helpers de StatusPill e Data mantêm iguais ...
// (Copie os helpers StatusPill e formatarData do arquivo original ou crie um utils)

function MuralMovimentacoes({ onEditar }) {
  const { mutate } = useSWRConfig();
  
  // Busca APENAS os dados recentes (30 dias)
  const { data, isLoading } = useSWR('getMuralRecente', getMuralRecente);

  const listaMural = useMemo(() => {
    if (!data) return [];
    const { ausencias, creditos } = data;
    
    // Unifica
    const lista = [
      ...ausencias.map(a => ({ ...a, tipo_item: 'debito', data_ordem: a.data_inicio })),
      ...creditos.map(c => ({ ...c, tipo_item: 'credito', data_ordem: c.data_lancamento, status: 'Concluído', descricao: c.tipo }))
    ];
    
    // Ordena
    return lista.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [data]);

  const handleDelete = async (item) => {
    if (!window.confirm("Tem certeza que deseja excluir?")) return;
    
    const toastId = toast.loading("Processando...");
    try {
      if (item.tipo_item === 'credito') {
        await deleteCreditoSeguro(item.id);
      } else {
        await deleteAusenciaSegura(item.id);
      }
      toast.success("Registro excluído.", { id: toastId });
      mutate('getMuralRecente'); // Atualiza o mural
    } catch (err) {
      // Aqui o erro de segurança será exibido para o usuário
      toast.error(err.message, { id: toastId, duration: 5000 });
    }
  };

  if (isLoading) return <div className="loading-state">Carregando mural...</div>;

  return (
    <div className="mural-grid">
      {listaMural.length === 0 && <p className="empty-state">Sem movimentos recentes.</p>}
      
      {listaMural.map(item => (
        <div key={item.id} className={`mural-card ${item.status === 'Concluído' ? 'locked' : ''}`}>
          <div className="card-header">
             {/* Use seu componente StatusPill aqui */}
             <span className={`pill ${item.status}`}>{item.status}</span>
             
             <div className="card-actions">
               {/* Só mostra editar/excluir se for Pendente ou Crédito Recente */}
               {item.status === 'Pendente' && (
                 <>
                   <button onClick={() => onEditar(item.id, item.tipo_item)} title="Editar"><span className="material-symbols-outlined">edit</span></button>
                   <button onClick={() => handleDelete(item)} title="Excluir"><span className="material-symbols-outlined">delete</span></button>
                 </>
               )}
               {item.status !== 'Pendente' && (
                 <span className="material-symbols-outlined icon-lock" title="Registro protegido contra exclusão (Auditoria)">lock</span>
               )}
             </div>
          </div>
          
          <div className="card-body">
            <img src={item.funcionarios?.avatar_url || `https://ui-avatars.com/api/?name=${item.funcionarios?.nome_completo}`} className="avatar" />
            <div>
              <strong>{item.funcionarios?.nome_completo}</strong>
              <p>{item.tipo || item.descricao}</p>
            </div>
          </div>
          
          <div className="card-footer">
             {/* Exibir datas formatadas */}
             <small>{new Date(item.data_ordem).toLocaleDateString('pt-BR')}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MuralMovimentacoes;