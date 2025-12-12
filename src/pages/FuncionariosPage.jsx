import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Feedback visual profissional

import { getFuncionarios } from '../services/funcionarioService';
import FuncionarioCard from '../components/FuncionarioCard';
import ModalDesligamento from '../components/Modal/ModalDesligamento';
import './FuncionariosPage.css';

function FuncionariosPage() {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig(); // Necessário para atualizar o cache manualmente após ações
  
  // -- ESTADOS DE CONTROLE --
  const [page, setPage] = useState(1);
  const [limit] = useState(9); // 9 cards por página (visual grade 3x3)
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Ativo');
  
  const [funcionarioParaDesligar, setFuncionarioParaDesligar] = useState(null);

  // -- EFEITOS (Debounce e Resets) --
  
  // 1. Debounce: Espera o usuário parar de digitar por 500ms antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Sempre volta para a pág 1 quando muda a busca
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Resetar página ao trocar filtro de status
  useEffect(() => {
    setPage(1);
  }, [filtroStatus]);

  // -- DATA FETCHING (SWR) --

  // A Key do SWR inclui todas as variáveis. Se mudar a página, o SWR busca de novo automaticamente.
  const SWR_KEY = ['getFuncionarios', page, limit, debouncedSearch, filtroStatus];

  // Fetcher adaptado para desestruturar a array de chaves
  const fetcher = ([_, p, l, s, st]) => getFuncionarios({ page: p, limit: l, search: s, status: st });

  const { data: resultado, error, isLoading } = useSWR(SWR_KEY, fetcher, {
    keepPreviousData: true, // Mantém os dados antigos na tela enquanto carrega a nova página (UX muito melhor)
    revalidateOnFocus: false, // Evita recargas desnecessárias ao trocar de aba
  });

  // Extração segura dos dados retornados pelo service
  const funcionarios = resultado?.data || [];
  const totalPages = resultado?.totalPages || 1;
  const totalRegistros = resultado?.count || 0;

  // -- HANDLERS --

  const handleDesligamentoSuccess = () => {
    setFuncionarioParaDesligar(null);
    mutate(SWR_KEY); // Força a atualização da lista
    toast.success('Colaborador desligado e histórico atualizado.');
  };

  if (error) {
    return (
      <div className="error-container">
        <span className="material-symbols-outlined error-icon">error</span>
        <h3>Não foi possível carregar os dados.</h3>
        <button onClick={() => mutate(SWR_KEY)} className="btn-retry">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="funcionarios-container">
      {/* CABEÇALHO */}
      <div className="page-header">
        <div>
          <h1>Colaboradores</h1>
          <p>
            Gerenciando <strong>{totalRegistros}</strong> registro(s).
          </p>
        </div>
        <Link to="/funcionarios/novo" className="btn-novo link-button">
          <span className="material-symbols-outlined">add</span>
          Novo Colaborador
        </Link>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="filters-bar">
        <div className="search-input-wrapper">
          <span className="material-symbols-outlined">search</span>
          <input 
            type="text" 
            placeholder="Buscar por nome ou cargo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="status-tabs">
          {['Ativo', 'Inativo', 'Todos'].map((status) => (
            <button 
              key={status}
              className={filtroStatus === status ? 'active' : ''} 
              onClick={() => setFiltroStatus(status)}
            >
              {status === 'Inativo' ? 'Desligados' : status === 'Todos' ? 'Todos' : 'Ativos'}
            </button>
          ))}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      {isLoading && !funcionarios.length ? (
        <div className="loading-state">
           <div className="spinner"></div>
           <span>Carregando quadro de colaboradores...</span>
        </div>
      ) : (
        <>
          <div className="funcionarios-grid">
            {funcionarios.length === 0 ? (
              <div className="empty-grid">
                <span className="material-symbols-outlined">search_off</span>
                <p>Nenhum colaborador encontrado.</p>
              </div>
            ) : (
              funcionarios.map(func => (
                <div key={func.id} className={`funcionario-wrapper ${func.status === 'Inativo' ? 'inativo' : ''}`}>
                  
                  <FuncionarioCard 
                    funcionario={func} 
                    onEdit={() => navigate(`/funcionarios/editar/${func.id}`)}
                  />
                  
                  <div className="card-actions-footer">
                    <button 
                      className="btn-editar"
                      onClick={() => navigate(`/funcionarios/editar/${func.id}`)}
                    >
                      <span className="material-symbols-outlined">edit</span> Editar
                    </button>

                    {func.status !== 'Inativo' ? (
                      <button 
                        className="btn-desligar" 
                        title="Desligar Colaborador"
                        onClick={() => setFuncionarioParaDesligar(func)}
                      >
                        <span className="material-symbols-outlined">person_remove</span>
                        Desligar
                      </button>
                    ) : (
                      <span className="badge-desligado">
                         <span className="material-symbols-outlined">block</span> Desligado
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* RODAPÉ COM PAGINAÇÃO */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="btn-page"
              >
                <span className="material-symbols-outlined">chevron_left</span> Anterior
              </button>
              
              <span className="page-info">
                Página <strong>{page}</strong> de <strong>{totalPages}</strong>
              </span>

              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="btn-page"
              >
                Próxima <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* MODAL (Renderização Condicional) */}
      {funcionarioParaDesligar && (
        <ModalDesligamento 
          funcionario={funcionarioParaDesligar}
          onClose={() => setFuncionarioParaDesligar(null)}
          onSuccess={handleDesligamentoSuccess} 
        />
      )}
    </div>
  );
}

export default FuncionariosPage;