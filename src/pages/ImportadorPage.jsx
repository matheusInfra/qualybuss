



// src/pages/ImportadorPage.jsx
import React from 'react';
import ImportadorFuncionarios from '../components/Importacao/ImportadorFuncionarios';
import './ImportadorPage.css';

export default function ImportadorPage() {
  return (
    <div className="importador-page-container">
      <div className="page-header">
        <h1>Central de Importação</h1>
        <p>Importe dados em massa via arquivos CSV.</p>
      </div>
      
      <div className="importador-content fade-in">
        <ImportadorFuncionarios onSuccess={() => console.log("Importação finalizada")} />
      </div>
    </div>
  );
}