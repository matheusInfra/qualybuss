import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { getFuncionarios } from '../services/funcionarioService';
import FuncionarioCard from '../components/FuncionarioCard';
import ModalDesligamento from '../components/Modal/ModalDesligamento';
import './FuncionariosPage.css';

function FuncionariosPage() {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();
  
  const [page, setPage] = useState(1);
  const [limit] = useState(9);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Ativo');
  
  const [funcionarioParaDesligar, setFuncionarioParaDesligar] = useState(null);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [filtroStatus]);

  const SWR_KEY = ['getFuncionarios', page, limit, debouncedSearch, filtroStatus];
  const fetcher = ([_, p, l, s, st]) => getFuncionarios({ page: p, limit: l, search: s, status: st });

  const { data: resultado, error, isLoading } = useSWR(SWR_KEY, fetcher, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  const funcionarios = resultado?.data || [];
  const totalPages = resultado?.totalPages || 1;
  const totalRegistros = resultado?.count || 0;

  const handleDesligamentoSuccess = () => {
    setFuncionarioParaDesligar(null);
    mutate(SWR_KEY);
    toast.success('Colaborador desligado com sucesso.');
  };

  if (error) {
    return (
      <div className="error-container">
        <h3>Não foi possível carregar os dados.</h3>
        <button onClick={() => mutate(SWR_KEY)} className="btn-retry">Tentar Novamente</button>
      </div>
    );
  }

  return (
    <div className="funcionarios-container fade-in">
      <div className="page-header">
        <div>
          <h1>Colaboradores</h1>
          <p>Gerenciando <strong>{totalRegistros}</strong> registro(s).</p>
        </div>
        <Link to="/funcionarios/novo" className="btn-novo link-button">
          <span className="material-symbols-outlined">add</span> Novo Colaborador
        </Link>
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

      {isLoading && !funcionarios.length ? (
        <div className="loading-state">
           <div className="spinner"></div><span>Carregando quadro...</span>
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
                  {/* IMPORTANTE: Passamos onEdit explicitamente com a rota correta */}
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
                        title="Desligar"
                        onClick={() => setFuncionarioParaDesligar(func)}
                      >
                        <span className="material-symbols-outlined">person_remove</span> Desligar
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

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-page">Anterior</button>
              <span className="page-info">Página <strong>{page}</strong> de <strong>{totalPages}</strong></span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-page">Próxima</button>
            </div>
          )}
        </>
      )}

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