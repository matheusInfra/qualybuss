import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
// Importamos a função paginada (já atualizada no passo anterior)
import { getFuncionarios } from '../services/funcionarioService';
import './FuncionariosPage.css'; // Reutiliza estilos de grid e paginação
import SkeletonCard from '../components/SkeletonCard';
import DocumentoCard from '../components/Documentos/DocumentoCard';

function DocumentosPage() {
  // -- ESTADOS DE CONTROLE --
  const [page, setPage] = useState(1);
  const [limit] = useState(9); // 9 cards por página
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Ativo');

  // -- EFEITOS (Debounce e Resets) --
  
  // 1. Debounce: Otimiza a busca para não travar enquanto digita
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Volta para a 1ª página ao buscar
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 2. Resetar página ao trocar filtro de status
  useEffect(() => {
    setPage(1);
  }, [filtroStatus]);

  // -- DATA FETCHING (SWR) --
  
  // A Key inclui todas as variáveis para o cache ser inteligente
  const SWR_KEY = ['getFuncionarios', page, limit, debouncedSearch, filtroStatus];

  // Fetcher adaptado para passar os parâmetros para a API
  const fetcher = ([_, p, l, s, st]) => getFuncionarios({ page: p, limit: l, search: s, status: st });

  const { data: resultado, error, isLoading } = useSWR(SWR_KEY, fetcher, {
    keepPreviousData: true, // Mantém os dados antigos na tela enquanto carrega a próxima página
    revalidateOnFocus: false
  });

  // Extração segura dos dados (agora compatível com a paginação)
  const funcionarios = resultado?.data || [];
  const totalPages = resultado?.totalPages || 1;
  const totalRegistros = resultado?.count || 0;

  // -- RENDERIZAÇÃO --

  if (error) {
    return (
      <div className="funcionarios-container">
        <div className="error-container">
          <span className="material-symbols-outlined error-icon">error</span>
          <h3>Falha ao carregar colaboradores.</h3>
          <p>Verifique sua conexão e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="funcionarios-container">
      <div className="page-header">
        <div>
          <h1>Gestão de Documentos</h1>
          <p>Selecione um colaborador ({totalRegistros} encontrados) para gerenciar arquivos.</p>
        </div>
      </div>

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
          <button
            className={filtroStatus === 'Ativo' ? 'active' : ''}
            onClick={() => setFiltroStatus('Ativo')}
          >
            Ativos
          </button>
          <button
            className={filtroStatus === 'Inativo' ? 'active' : ''}
            onClick={() => setFiltroStatus('Inativo')}
          >
            Desligados
          </button>
          <button
            className={filtroStatus === 'Todos' ? 'active' : ''}
            onClick={() => setFiltroStatus('Todos')}
          >
            Todos
          </button>
        </div>
      </div>

      {/* GRADE DE CARDS */}
      <div className="funcionarios-grid">
        {isLoading && !funcionarios.length ? (
          // Mostra Skeletons enquanto carrega pela primeira vez
          [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          funcionarios.length === 0 ? (
            <div className="empty-grid">
              <span className="material-symbols-outlined">folder_off</span>
              <p>Nenhum colaborador encontrado.</p>
            </div>
          ) : (
            funcionarios.map(func => (
              <DocumentoCard key={func.id} funcionario={func} />
            ))
          )
        )}
      </div>

      {/* RODAPÉ COM PAGINAÇÃO (Importante para navegar entre os registros) */}
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
    </div>
  );
}

export default DocumentosPage;