import React from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { getFuncionarioById } from '../services/funcionarioService';
import DocumentoUploadForm from '../components/Documentos/DocumentoUploadForm';
import DocumentoLista from '../components/Documentos/DocumentoLista';

function DocumentoDetalhePage() {
  const { id } = useParams(); // Pega o ID do funcionário da URL

  // Busca os dados do funcionário (para mostrar o nome)
  const { data: funcionario, error, isLoading } = useSWR(
    ['funcionario', id], // Chave única
    () => getFuncionarioById(id)
  );

  if (isLoading) return <p>Carregando...</p>;
  if (error) return <p className="error-message">Erro ao carregar colaborador.</p>;
  if (!funcionario) return <p>Colaborador não encontrado.</p>;

  return (
    <div style={{width: '100%'}}>
      
      {/* Cabeçalho da Página */}
      <div style={{ marginBottom: '24px' }}>
        <Link 
          to="/documentos" 
          style={{ textDecoration: 'none', color: '#555', fontSize: '14px' }}
        >
          &larr; Voltar para a seleção
        </Link>
        <h1 style={{ margin: '4px 0 0 0' }}>
          Documentos de: {funcionario.nome_completo}
        </h1>
      </div>

      {/* 1. Componente de Upload */}
      <h2 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px'}}>Adicionar Novo Documento</h2>
      <DocumentoUploadForm funcionarioId={id} />

      {/* 2. Componente da Lista */}
      <hr style={{margin: '32px 0'}} />
      <h2 style={{fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px'}}>Documentos Salvos</h2>
      <DocumentoLista funcionarioId={id} />

    </div>
  );
}

export default DocumentoDetalhePage;