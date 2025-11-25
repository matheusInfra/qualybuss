// src/pages/FeriasPage.jsx
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { getFuncionarios } from '../services/funcionarioService';
import CalendarioFerias from '../components/Ferias/CalendarioFerias';
import ControlesCalendario from '../components/Ferias/ControlesCalendario';
// Importação do formulário de ausências para o Modal
import LancarAusenciaForm from '../components/Ausencias/LancarAusenciaForm';
import './FeriasPage.css';

function FeriasPage() {
  const [dataExibida, setDataExibida] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  
  // Estado para controlar o Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAusenciaId, setSelectedAusenciaId] = useState(null);

  // Busca funcionários para extrair os departamentos
  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  const departamentosUnicos = useMemo(() => {
    if (!funcionarios) return ['Todos']; 
    const deps = new Set(
      funcionarios
        .map(f => f.departamento)
        .filter(Boolean) 
    );
    return ['Todos', ...Array.from(deps)];
  }, [funcionarios]);

  const handleDataChange = (novaData) => {
    setDataExibida(novaData);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDepartamentoFiltro('Todos');
  };

  // --- Handlers do Modal ---
  
  const handleSolicitarFerias = () => {
    setSelectedAusenciaId(null); // Limpa ID para criar novo
    setIsModalOpen(true);
  };

  const handleEditAusencia = (id) => {
    setSelectedAusenciaId(id); // Seta ID para edição
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAusenciaId(null);
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
        listaDepartamentos={departamentosUnicos} 
      />
      
      <CalendarioFerias 
        data={dataExibida} 
        searchTerm={searchTerm}
        departamentoFiltro={departamentoFiltro}
        onEventClick={handleEditAusencia} // Passa a função de clique
      />

      {/* MODAL DE INTEGRAÇÃO */}
      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <div className="modal-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'
            }}>
              <h3 style={{margin:0, fontSize:'1.2rem', color:'#1e293b'}}>
                {selectedAusenciaId ? 'Editar Lançamento' : 'Nova Solicitação'}
              </h3>
              <button 
                onClick={handleCloseModal}
                style={{
                  background:'none', border:'none', fontSize:'24px', cursor:'pointer', color:'#64748b'
                }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <LancarAusenciaForm 
                idParaEditar={selectedAusenciaId} 
                onClose={handleCloseModal} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeriasPage;