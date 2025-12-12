// src/pages/FeriasPage.jsx
import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
// CORREÇÃO: Importamos a função de dropdown que retorna array simples
import { getFuncionariosDropdown } from '../services/funcionarioService';
import CalendarioFerias from '../components/Ferias/CalendarioFerias';
import ControlesCalendario from '../components/Ferias/ControlesCalendario';
import LancarAusenciaForm from '../components/Ausencias/LancarAusenciaForm';
import './FeriasPage.css';

function FeriasPage() {
  const [dataExibida, setDataExibida] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  
  // Estado para controlar o Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAusenciaId, setSelectedAusenciaId] = useState(null);

  // CORREÇÃO: Usamos getFuncionariosDropdown. 
  // Isso evita o erro do .map e é mais performático (traz menos dados).
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  const departamentosUnicos = useMemo(() => {
    if (!funcionarios) return ['Todos']; 
    
    // O Set garante que não haja duplicatas
    const deps = new Set(
      funcionarios
        .map(f => f.departamento)
        .filter(d => d && d.trim() !== '') // Remove nulos ou vazios
    );
    
    // Ordena alfabeticamente para ficar organizado
    return ['Todos', ...Array.from(deps).sort()];
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
        onEventClick={handleEditAusencia}
      />

      {/* MODAL DE INTEGRAÇÃO (Centralizado e Estilizado) */}
      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', // Fundo um pouco mais escuro
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          backdropFilter: 'blur(3px)' // Efeito de desfoque moderno
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '95%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <div className="modal-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px',
              borderBottom: '1px solid #f1f5f9', paddingBottom: '10px'
            }}>
              <h3 style={{margin:0, fontSize:'1.2rem', color:'#1e293b', fontWeight: '600'}}>
                {selectedAusenciaId ? 'Editar Lançamento' : 'Nova Solicitação'}
              </h3>
              <button 
                onClick={handleCloseModal}
                style={{
                  background:'transparent', border:'none', fontSize:'28px', cursor:'pointer', color:'#94a3b8',
                  lineHeight: '1', padding: '0 5px'
                }}
              >
                &times;
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