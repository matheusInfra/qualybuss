// src/components/Ferias/ControlesCalendario.jsx
import React from 'react';
import { getMonthName } from '../../utils/dateUtils';
import './ControlesCalendario.css';

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 5 }, (_, i) => ANO_ATUAL - 2 + i);

function ControlesCalendario({ 
  data, 
  onDataChange, 
  searchTerm, 
  setSearchTerm,
  onClearFilters,
  departamento,
  setDepartamento,
  // --- A CORREÇÃO ESTÁ AQUI ---
  // Adicionamos ' = [] ' para garantir que nunca seja 'undefined'
  listaDepartamentos = [],
}) {
  
  const mesAtual = data.getMonth(); // 0-11
  const anoAtual = data.getFullYear();

  const handleMesChange = (e) => {
    onDataChange(new Date(anoAtual, parseInt(e.target.value), 1));
  };
  const handleAnoChange = (e) => {
    onDataChange(new Date(parseInt(e.target.value), mesAtual, 1));
  };

  const handlePrevMonth = () => {
    onDataChange(new Date(data.getFullYear(), data.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    onDataChange(new Date(data.getFullYear(), data.getMonth() + 1, 1));
  };

  return (
    <div className="calendar-controls-container">
      {/* Navegação de Data */}
      <div className="date-navigation">
        <select className="control-select" value={mesAtual} onChange={handleMesChange}>
          {MESES.map((nome, index) => (
            <option key={nome} value={index}>Mês: {nome}</option>
          ))}
        </select>
        <select className="control-select" value={anoAtual} onChange={handleAnoChange}>
          {ANOS.map(ano => (
            <option key={ano} value={ano}>Ano: {ano}</option>
          ))}
        </select>
        <div className="arrow-buttons">
          <button className="arrow-button" onClick={handlePrevMonth}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="arrow-button" onClick={handleNextMonth}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="search-bar">
        <div className="search-icon">
          <span className="material-symbols-outlined">search</span>
        </div>
        <input 
          className="search-input"
          placeholder="Buscar por colaborador..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Filtros */}
      <div className="filters">
        <select 
          className="control-select" 
          value={departamento} 
          onChange={(e) => setDepartamento(e.target.value)}
        >
          {/* Agora, 'listaDepartamentos.map' é seguro */}
          {listaDepartamentos.map(dep => (
            <option key={dep} value={dep}>
              {dep === 'Todos' ? 'Departamento: Todos' : dep}
            </option>
          ))}
        </select>
        <button 
          className="clear-filters-button" 
          onClick={onClearFilters}
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  );
}

export default ControlesCalendario;