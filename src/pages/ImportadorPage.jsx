import React, { useState } from 'react';
import ImportadorFuncionarios from '../components/Importacao/ImportadorFuncionarios';
import ImportadorHolerites from '../components/Importacao/ImportadorHolerites'; // Importe o novo componente
import './ImportadorPage.css';

export default function ImportadorPage() {
  const [activeTab, setActiveTab] = useState('funcionarios'); // 'funcionarios' ou 'holerites'

  return (
    <div className="importador-page-container">
      <div className="page-header">
        <h1>Central de Importação</h1>
        <p>Importe dados em massa para o sistema.</p>
      </div>

      {/* NAVEGAÇÃO POR ABAS */}
      <div className="importador-tabs">
        <button 
          className={`tab-btn ${activeTab === 'funcionarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('funcionarios')}
        >
          <span className="material-symbols-outlined">group_add</span>
          Funcionários (CSV)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'holerites' ? 'active' : ''}`}
          onClick={() => setActiveTab('holerites')}
        >
          <span className="material-symbols-outlined">receipt_long</span>
          Holerites (PDF)
        </button>
      </div>
      
      <div className="importador-content fade-in">
        {activeTab === 'funcionarios' && (
          <ImportadorFuncionarios onSuccess={() => console.log("CSV Importado")} />
        )}

        {activeTab === 'holerites' && (
          <ImportadorHolerites onSuccess={() => console.log("Holerites Enviados")} />
        )}
      </div>
    </div>
  );
}