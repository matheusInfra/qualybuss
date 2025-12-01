// src/pages/FuncionariosPage.jsx
import React, { useState } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import FuncionarioCard from '../components/FuncionarioCard';
import { useNavigate } from 'react-router-dom';
import ModalDesligamento from '../components/Modal/ModalDesligamento'; // Certifique-se de ter este componente criado
import './FuncionariosPage.css';

function FuncionariosPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Ativo'); // 'Ativo', 'Inativo', 'Todos'
  
  // Estado para controlar qual funcionário está sendo desligado
  const [funcionarioParaDesligar, setFuncionarioParaDesligar] = useState(null);

  const { data: funcionarios, error, isLoading } = useSWR('getFuncionarios', getFuncionarios);

  // Lógica de Filtragem
  const filteredFuncionarios = funcionarios?.filter(f => {
    // 1. Filtro de Texto
    const matchesSearch = f.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          f.cargo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filtro de Status
    const status = f.status || 'Ativo'; // Se for null, assume Ativo
    const matchesStatus = filtroStatus === 'Todos' ? true : status === filtroStatus;

    return matchesSearch && matchesStatus;
  });

  if (error) return <div className="error-state">Erro ao carregar dados.</div>;

  return (
    <div className="funcionarios-container">
      <div className="page-header">
        <div>
          <h1>Colaboradores</h1>
          <p>Gerencie o quadro de funcionários da empresa.</p>
        </div>
        <button className="btn-novo" onClick={() => navigate('/funcionarios/novo')}>
          <span className="material-symbols-outlined">add</span>
          Novo Colaborador
        </button>
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

      {isLoading ? (
        <div className="loading-state">Carregando colaboradores...</div>
      ) : (
        <div className="funcionarios-grid">
          {filteredFuncionarios?.length === 0 ? (
            <div className="empty-grid">Nenhum colaborador encontrado neste filtro.</div>
          ) : (
            filteredFuncionarios?.map(func => (
              <div key={func.id} className={`funcionario-wrapper ${func.status === 'Inativo' ? 'inativo' : ''}`}>
                
                <FuncionarioCard 
                  funcionario={func} 
                  // Ao clicar no card, vai para edição/detalhes
                  onEdit={() => navigate(`/funcionarios/${func.id}`)}
                />
                
                {/* Barra de Ações do Card */}
                <div className="card-actions-footer">
                  <button 
                    className="btn-editar"
                    onClick={() => navigate(`/funcionarios/${func.id}`)}
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
                    <span className="badge-desligado">Desligado</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal de Desligamento */}
      {funcionarioParaDesligar && (
        <ModalDesligamento 
          funcionario={funcionarioParaDesligar}
          onClose={() => setFuncionarioParaDesligar(null)}
        />
      )}
    </div>
  );
}

export default FuncionariosPage;