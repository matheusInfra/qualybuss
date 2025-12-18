import React, { useState, useMemo, useEffect } from 'react'; // Adicionado useEffect
import useSWR from 'swr';
import { getFuncionariosDropdown } from '../services/funcionarioService';
// IMPORTANTE: Importar o serviço de busca de férias
import { getFeriasAprovadasParaCalendario } from '../services/ausenciaService'; 

import CalendarioFerias from '../components/Ferias/CalendarioFerias';
import ControlesCalendario from '../components/Ferias/ControlesCalendario';
import LancarAusenciaForm from '../components/Ausencias/LancarAusenciaForm';
import './FeriasPage.css';

function FeriasPage() {
  const [dataExibida, setDataExibida] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  
  // NOVO ESTADO: Armazena as férias buscadas do banco
  const [listaFerias, setListaFerias] = useState([]);
  const [isLoadingFerias, setIsLoadingFerias] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAusenciaId, setSelectedAusenciaId] = useState(null);

  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  // --- CORREÇÃO: Buscar dados quando os filtros ou data mudarem ---
  useEffect(() => {
    const fetchFerias = async () => {
      setIsLoadingFerias(true);
      try {
        const ano = dataExibida.getFullYear();
        // O JavaScript conta meses de 0 a 11, mas seu serviço provavelmente espera 1-12 ou o próprio Date
        // Verifiquei o serviço: ele espera (ano, mes) numérico.
        const mes = dataExibida.getMonth() + 1; 
        
        const dados = await getFeriasAprovadasParaCalendario(
          ano, 
          mes, 
          searchTerm, 
          departamentoFiltro
        );
        
        setListaFerias(dados || []);
      } catch (error) {
        console.error("Erro ao buscar férias:", error);
      } finally {
        setIsLoadingFerias(false);
      }
    };

    fetchFerias();
  }, [dataExibida, searchTerm, departamentoFiltro]); // Recarrega se qualquer um destes mudar

  const departamentosUnicos = useMemo(() => {
    if (!funcionarios) return ['Todos']; 
    const deps = new Set(
      funcionarios
        .map(f => f.departamento)
        .filter(d => d && d.trim() !== '')
    );
    return ['Todos', ...Array.from(deps).sort()];
  }, [funcionarios]);

  const handleDataChange = (novaData) => {
    setDataExibida(novaData);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDepartamentoFiltro('Todos');
  };

  const handleSolicitarFerias = () => {
    setSelectedAusenciaId(null);
    setIsModalOpen(true);
  };

  const handleEditAusencia = (id) => {
    setSelectedAusenciaId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAusenciaId(null);
    // Opcional: Recarregar dados após fechar modal para ver atualizações
    // Pode-se disparar um re-fetch aqui alterando um estado auxiliar
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
      
      {/* CORREÇÃO: Passar a prop 'ferias' e a prop 'data' para o calendário */}
      <CalendarioFerias 
        data={dataExibida}  // Importante para o calendário saber qual mês mostrar
        ferias={listaFerias} // Importante para mostrar os eventos
        searchTerm={searchTerm}
        departamentoFiltro={departamentoFiltro}
        onEventClick={handleEditAusencia}
      />

      {isModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', 
          alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(3px)'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white', padding: '24px', borderRadius: '12px',
            maxWidth: '600px', width: '95%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)', position: 'relative'
          }}>
            <div className="modal-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px'
            }}>
              <h3 style={{margin:0, fontSize:'1.2rem', color:'#1e293b', fontWeight: '600'}}>
                {selectedAusenciaId ? 'Editar Lançamento' : 'Nova Solicitação'}
              </h3>
              <button 
                onClick={handleCloseModal}
                style={{
                  background:'transparent', border:'none', fontSize:'28px', 
                  cursor:'pointer', color:'#94a3b8', lineHeight: '1', padding: '0 5px'
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