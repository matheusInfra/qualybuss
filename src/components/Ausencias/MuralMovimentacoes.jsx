// src/components/Ausencias/MuralMovimentacoes.jsx
import React, { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { 
  getHistoricoAusencias, 
  getHistoricoCreditos,
  deleteAusencia, 
  deleteCredito,
  concluirSolicitacao // <-- 1. IMPORTADO
} from '../../services/ausenciaService';
import { getFuncionarios, getAvatarPublicUrl } from '../../services/funcionarioService';
import { toast } from 'react-hot-toast';
import ModalConfirmacao from '../Modal/ModalConfirmacao';

import './MuralMovimentacoes.css';

// --- Helpers (StatusPill, formatarData, etc) ---
const StatusPill = ({ tipo, status }) => {
  let text = status;
  let className = 'status-pill';

  if (tipo === 'credito') {
    text = 'Crédito'; 
    className += ' aprovado'; // Créditos são verdes
  } else {
    switch (status?.toLowerCase()) {
      case 'aprovado': className += ' aprovado'; break;
      case 'rejeitado': className += ' rejeitado'; break;
      case 'concluído': className += ' concluido'; break;
      case 'pendente': default: text = 'Pendente'; className += ' pendente'; break;
    }
  }
  return <div className={className}>{text}</div>;
};

const formatarData = (dataInput) => {
  if (!dataInput) return 'N/A';
  let data;
  if (typeof dataInput === 'string') {
    data = new Date(dataInput.replace(/-/g, '/'));
  } else if (dataInput instanceof Date) {
    data = dataInput;
  } else {
    return 'N/A';
  }
  return data.toLocaleDateString('pt-BR');
};

const getFuncionarioInfo = (id, funcionariosMap) => {
  return funcionariosMap.get(id) || { nome: '(Desconhecido)', avatar_url: null };
};


function MuralMovimentacoes({ onEditarClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, item: null });
  
  const { mutate } = useSWRConfig();

  // --- Buscas SWR ---
  const { data: ausencias } = useSWR('getHistoricoAusencias', getHistoricoAusencias);
  const { data: creditos } = useSWR('getHistoricoCreditos', getHistoricoCreditos);
  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // --- Fusão de Dados ---
  const { movimentacoes, funcionariosMap } = useMemo(() => {
    if (!funcionarios || !ausencias || !creditos) {
      return { movimentacoes: [], funcionariosMap: new Map() };
    }
    const funcMap = new Map(funcionarios.map(f => [f.id, f]));
    
    const creditosFormatados = creditos.map(c => ({
      id: c.id,
      tipo: 'credito',
      data: new Date(c.data_lancamento.replace(/-/g, '/')),
      funcionarioId: c.funcionario_id,
      descricao: c.tipo,
      detalhe: `+ ${c.quantidade} ${c.unidade}`,
      motivo: c.motivo,
      status: 'Concluído', // Créditos nascem concluídos
      origem: 'creditos_saldo',
      anexo_path: null
    }));

    const debitosFormatados = ausencias.map(a => ({
      id: a.id,
      tipo: 'debito',
      data: new Date(a.data_inicio.replace(/-/g, '/')),
      funcionarioId: a.funcionario_id,
      descricao: a.tipo,
      detalhe: `${formatarData(a.data_inicio)} - ${formatarData(a.data_fim)}`,
      motivo: a.motivo,
      status: a.status || 'Pendente',
      origem: 'solicitacoes_ausencia', // Necessário para dar baixa
      anexo_path: a.anexo_path
    }));

    const tudoJunto = [...creditosFormatados, ...debitosFormatados];
    tudoJunto.sort((a, b) => b.data - a.data); 
    return { movimentacoes: tudoJunto, funcionariosMap: funcMap };
  }, [ausencias, creditos, funcionarios]);

  // --- Filtro ---
  const filteredMovimentacoes = useMemo(() => {
    const termo = searchTerm.toLowerCase();
    if (!termo) return movimentacoes;

    return movimentacoes.filter(item => {
      const funcionario = getFuncionarioInfo(item.funcionarioId, funcionariosMap);
      return (
        item.status?.toLowerCase().includes(termo) ||
        funcionario.nome.toLowerCase().includes(termo) ||
        item.detalhe.toLowerCase().includes(termo)
      );
    });
  }, [searchTerm, movimentacoes, funcionariosMap]);


  // --- Ações ---
  const handleDeleteClick = (item) => {
    setDeleteModal({ isOpen: true, item: item });
  };

  // --- 2. NOVA FUNÇÃO: DAR BAIXA ---
  const handleConcluirClick = async (item) => {
    if (!window.confirm(`Confirmar a baixa de "${item.descricao}"? Isso travará o registro.`)) return;

    const toastId = toast.loading('Atualizando...');
    try {
      await concluirSolicitacao(item.id, item.origem);
      
      // Atualiza o Mural e o Painel de Saldos
      mutate('getHistoricoAusencias');
      // (Se créditos pudessem ser pendentes, atualizaríamos eles também)
      
      toast.success('Baixa realizada!', { id: toastId });
    } catch (err) {
      toast.error('Erro ao dar baixa.', { id: toastId });
    }
  };

  const handleConfirmDelete = async () => {
    const { item } = deleteModal;
    if (!item) return;

    toast.loading('Excluindo...');
    try {
      if (item.tipo === 'credito') {
        await deleteCredito(item.id);
        mutate('getHistoricoCreditos');
      } else {
        await deleteAusencia(item.id, item.anexo_path);
        mutate('getHistoricoAusencias');
      }
      toast.dismiss();
      toast.success('Excluído!');
    } catch (err) {
      toast.dismiss();
      toast.error(err.message);
    } finally {
      setDeleteModal({ isOpen: false, item: null });
    }
  };

  const isLoading = !ausencias || !creditos || !funcionarios;

  return (
    <div className="mural-wrapper">
      <div className="mural-search-bar">
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Filtrar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading && <p>Carregando...</p>}

      {!isLoading && filteredMovimentacoes.length === 0 && (
        <p className="mural-empty">Nenhum lançamento encontrado.</p>
      )}

      <div className="mural-card-grid">
        {filteredMovimentacoes.map((item) => {
          const funcionario = getFuncionarioInfo(item.funcionarioId, funcionariosMap);
          const avatarUrl = funcionario.avatar_url ? getAvatarPublicUrl(funcionario.avatar_url) : 'https://placehold.co/100';

          const isConcluido = item.status === 'Concluído';
          const isAprovado = item.status === 'Aprovado';
          const isDebito = item.tipo === 'debito';

          return (
            <div key={`${item.tipo}-${item.id}`} className={`mural-card ${isConcluido ? 'card-locked' : ''}`}>
              <div className="card-header">
                <StatusPill tipo={item.tipo} status={item.status} />
                
                <div className="card-menu-container">
                  {/* --- 3. BOTÃO DE BAIXA (Só aparece se for Débito Aprovado) --- */}
                  {!isConcluido && isAprovado && isDebito && (
                    <button 
                      className="card-menu-button success" // Classe nova (verde)
                      title="Dar Baixa (Concluir)"
                      onClick={() => handleConcluirClick(item)}
                    >
                      <span className="material-symbols-outlined">check_circle</span>
                    </button>
                  )}

                  {!isConcluido && (
                    <>
                      <button 
                        className="card-menu-button"
                        title="Editar"
                        onClick={() => onEditarClick(item.id, item.tipo)}
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button 
                        className="card-menu-button delete"
                        title="Excluir"
                        onClick={() => handleDeleteClick(item)}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </>
                  )}
                  
                  {isConcluido && (
                    <span className="material-symbols-outlined" style={{color: '#ccc'}} title="Bloqueado">lock</span>
                  )}
                </div>
              </div>

              <div className="card-body">
                <img src={avatarUrl} alt={funcionario.nome} className="card-avatar" />
                <div className="card-info">
                  <p className="card-nome">{funcionario.nome}</p>
                  <p className="card-cargo">{item.descricao}</p>
                </div>
              </div>

              <div className="card-footer">
                <p className="card-data">{item.detalhe}</p>
              </div>
            </div>
          );
        })}
      </div>

      <ModalConfirmacao
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
      >
        <p>Deseja excluir este lançamento?</p>
        <p><strong>{deleteModal.item?.descricao}</strong></p>
        <p>Esta ação é irreversível.</p>
      </ModalConfirmacao>
    </div>
  );
}

export default MuralMovimentacoes;