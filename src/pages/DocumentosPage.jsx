import React, { useState } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
// 1. REUTILIZAMOS o CSS da página de funcionários
import './FuncionariosPage.css';
// 2. REUTILIZAMOS o SkeletonCard
import SkeletonCard from '../components/SkeletonCard';
// 3. IMPORTAMOS o novo card que criamos
import DocumentoCard from '../components/Documentos/DocumentoCard';

function DocumentosPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // 4. Buscamos todos os funcionários
  const {
    data: funcionarios,
    error,
    isLoading
  } = useSWR('getFuncionarios', getFuncionarios);

  // 5. Lógica de filtro (exatamente como na página de funcionários)
  const filteredFuncionarios = (funcionarios || []).filter(func =>
    func.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (func.cargo && func.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // 6. Tratamento de erro e loading
  if (error) {
    return (
      <div className="funcionarios-container">
        <p className="error-message">Falha ao carregar colaboradores.</p>
      </div>
    );
  }

  // 7. Renderização da página
  return (
    <div className="funcionarios-container">
      <div className="page-header">
        <div>
          <h1>Gestão de Documentos</h1>
          <p>Selecione um colaborador para gerenciar os arquivos.</p>
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
      </div>

      <div className="funcionarios-grid">
        {isLoading ? (
          [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          filteredFuncionarios.length === 0 ? (
            <div className="empty-grid">Nenhum colaborador encontrado.</div>
          ) : (
            // 8. Usamos o NOVO DocumentoCard
            filteredFuncionarios.map(func => (
              <DocumentoCard key={func.id} funcionario={func} />
            ))
          )
        )}
      </div>
    </div>
  );
}

export default DocumentosPage;