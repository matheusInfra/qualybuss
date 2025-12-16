// src/pages/ImportadorPage.jsx
import React from 'react';
import ImportadorFuncionarios from '../components/Importacao/ImportadorFuncionarios';
import './ImportadorPage.css'; // Importante: Este arquivo deve existir!

export default function ImportadorPage() {
  return (
    <div className="importador-page-container">
      <div className="page-header">
        <h1>Central de Importação</h1>
        <p>Importe dados de funcionários em massa via arquivo CSV.</p>
      </div>
      
      <div className="importador-content fade-in">
        <ImportadorFuncionarios onSuccess={() => console.log("Importação finalizada com sucesso")} />
      </div>
    </div>
  );
}