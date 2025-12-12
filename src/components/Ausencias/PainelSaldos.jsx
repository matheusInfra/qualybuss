import React from 'react';
import useSWR from 'swr';
// Importamos a nova função específica para dropdowns
import { getFuncionariosDropdown } from '../../services/funcionarioService';
import { getResumoSaldos } from '../../services/ausenciaService';
import './PainelSaldos.css';

function PainelSaldos({ aoAjustar }) {
  const [selectedFuncionario, setSelectedFuncionario] = React.useState('');
  
  // 1. Busca Funcionários (Usando a versão leve e sem paginação)
  const { data: funcionarios, error: errorFuncs } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  // 2. Busca Saldos Unificados (Só dispara se tiver funcionário selecionado)
  const { data: saldos, isLoading } = useSWR(
    selectedFuncionario ? ['getResumoSaldos', selectedFuncionario] : null,
    () => getResumoSaldos(selectedFuncionario)
  );

  const getFuncionarioObj = () => funcionarios?.find(f => f.id === selectedFuncionario);

  // Helper para cor do saldo
  const getSaldoClass = (valor, tipo) => {
    if (tipo === 'banco' && valor < 0) return 'text-red'; // Devendo horas
    if (valor > 0) return 'text-green';
    return 'text-gray';
  };

  // Tratamento de erro na carga do dropdown
  if (errorFuncs) {
    return <div className="error-msg">Erro ao carregar lista de colaboradores.</div>;
  }

  return (
    <div className="painel-saldos-container">
      {/* Seletor de Funcionário */}
      <div className="painel-header-control">
        <label>Visualizar Saldos de:</label>
        <select 
          value={selectedFuncionario} 
          onChange={(e) => setSelectedFuncionario(e.target.value)}
          className="select-funcionario"
          disabled={!funcionarios} // Trava enquanto carrega
        >
          <option value="">-- Selecione um Colaborador --</option>
          {/* O map agora funciona pois getFuncionariosDropdown retorna array puro */}
          {funcionarios?.map(f => (
            <option key={f.id} value={f.id}>{f.nome_completo}</option>
          ))}
        </select>
      </div>

      {!selectedFuncionario && (
        <div className="empty-state-saldos">
          <span className="material-symbols-outlined">account_balance_wallet</span>
          <h3>Selecione um colaborador para ver a carteira de tempo.</h3>
        </div>
      )}

      {selectedFuncionario && isLoading && (
        <div className="loading-saldos">
          <div className="spinner-small"></div> Calculando saldos...
        </div>
      )}

      {selectedFuncionario && saldos && (
        <div className="cards-grid fade-in">
          
          {/* Card 1: Férias */}
          <div className="saldo-card ferias">
            <div className="card-icon">🏖️</div>
            <div className="card-content">
              <span className="card-label">Saldo de Férias</span>
              <div className="card-value">
                {saldos.ferias.saldo} <small>dias</small>
              </div>
              <p className="card-obs">Baseado em períodos aquisitivos abertos.</p>
            </div>
          </div>

          {/* Card 2: Banco de Horas */}
          <div className="saldo-card banco">
            <div className="card-icon">⏱️</div>
            <div className="card-content">
              <span className="card-label">Banco de Horas</span>
              <div className={`card-value ${getSaldoClass(saldos.banco_horas.saldo, 'banco')}`}>
                {saldos.banco_horas.saldo} <small>horas</small>
              </div>
              <p className="card-obs">Acumulado de horas extras vs saídas.</p>
            </div>
          </div>

          {/* Card 3: Folgas Compensatórias */}
          <div className="saldo-card folga">
            <div className="card-icon">📅</div>
            <div className="card-content">
              <span className="card-label">Folgas (Day Off)</span>
              <div className={`card-value ${getSaldoClass(saldos.folgas.saldo, 'folga')}`}>
                {saldos.folgas.saldo} <small>dias</small>
              </div>
              <p className="card-obs">Trabalho em feriados ou prêmios.</p>
            </div>
          </div>

        </div>
      )}

      {selectedFuncionario && (
        <div className="actions-bar">
          <button className="btn-ajuste-manual" onClick={() => aoAjustar(getFuncionarioObj())}>
            <span className="material-symbols-outlined">tune</span>
            Realizar Ajuste Manual / Correção
          </button>
        </div>
      )}
    </div>
  );
}

export default PainelSaldos;