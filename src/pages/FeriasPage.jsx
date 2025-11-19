// src/pages/FeriasPage.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import CalendarioFerias from '../components/Ferias/CalendarioFerias';
import ControlesCalendario from '../components/Ferias/ControlesCalendario';
import './FeriasPage.css';

function FeriasPage() {
  const [dataExibida, setDataExibida] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  
  const navigate = useNavigate();

  // --- Busca funcionários para extrair os departamentos ---
  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  // --- Esta lógica agora vai funcionar, pois 'getFuncionarios' traz o 'departamento' ---
  const departamentosUnicos = useMemo(() => {
    if (!funcionarios) return ['Todos']; // Retorna um array padrão
    
    const deps = new Set(
      funcionarios
        .map(f => f.departamento)
        .filter(Boolean) // Remove nulos ou vazios
    );
    return ['Todos', ...Array.from(deps)];
  }, [funcionarios]);

  const handleDataChange = (novaData) => {
    setDataExibida(novaData);
  };

  const handleSolicitarFerias = () => {
    navigate('/ausencias');
  };
  
  const handleClearFilters = () => {
    setSearchTerm('');
    setDepartamentoFiltro('Todos');
  };

  return (
    <div className="ferias-container">
      <div className="ferias-header">
        <h1 className="ferias-title">Gestão de Férias</h1>
        <button className="ferias-button-novo" onClick={handleSolicitarFerias}>
          <span className="material-symbols-outlined">add</span>
          Solicitar Férias
        </button>
      </div>

      <ControlesCalendario 
        data={dataExibida} 
        onDataChange={handleDataChange} 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onClearFilters={handleClearFilters}
        departamento={departamentoFiltro}
        setDepartamento={setDepartamentoFiltro}
        listaDepartamentos={departamentosUnicos} // Passa a lista
      />
      
      <CalendarioFerias 
        data={dataExibida} 
        searchTerm={searchTerm}
        departamentoFiltro={departamentoFiltro}
      />
    </div>
  );
}

export default FeriasPage;