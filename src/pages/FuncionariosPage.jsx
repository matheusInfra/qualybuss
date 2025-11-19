import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useSWR from 'swr'; // Importa o SWR

import { getFuncionarios } from '../services/funcionarioService';
import FuncionarioCard from '../components/FuncionarioCard';
import SkeletonCard from '../components/SkeletonCard'; // Importa o Skeleton
import './FuncionariosPage.css';

function FuncionariosPage() {
  // Substitui o useState/useEffect pelo SWR
  const { data: funcionarios, error, isLoading } = useSWR('getFuncionarios', getFuncionarios);

  const [searchTerm, setSearchTerm] = useState('');

  // Filtra os dados (se existirem)
  const filteredFuncionarios = (funcionarios || []).filter(func =>
    func.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (func.cargo && func.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Tratamento de erro
  if (error) {
    return (
      <div className="mural-container">
        <p className="error-message">Falha ao carregar colaboradores.</p>
      </div>
    );
  }

  // Renderização
  return (
    <div className="mural-container">
      <div className="mural-header">
        <h1>Colaboradores</h1>
        <Link to="/funcionarios/novo" className="button-novo">
          + Adicionar Colaborador
        </Link>
      </div>

      <div className="mural-filter">
        <input
          type="text"
          placeholder="Buscar por nome ou cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="mural-grid">
        {isLoading ? (
          // Mostra 6 esqueletos durante o loading
          [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          // Mostra os dados reais
          filteredFuncionarios.length === 0 ? (
            <p>
              {searchTerm ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador cadastrado.'}
            </p>
          ) : (
            filteredFuncionarios.map(func => (
              <FuncionarioCard key={func.id} funcionario={func} />
            ))
          )
        )}
      </div>
    </div>
  );
}

export default FuncionariosPage;