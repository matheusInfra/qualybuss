// src/components/Ausencias/HistoricoAusencias.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionarios } from '../../services/funcionarioService';
import { getExtratoFiltrado, getAnexoAusenciaDownloadUrl } from '../../services/ausenciaService';
import './HistoricoAusencias.css';

// Helper Formatação
const fmtData = (d) => new Date(d).toLocaleDateString('pt-BR');
const fmtStatus = (s) => {
  const map = { 
    'Pendente': 'status-warning', 
    'Aprovado': 'status-success', 
    'Rejeitado': 'status-danger', 
    'Concluído': 'status-locked' 
  };
  return <span className={`status-badge ${map[s] || ''}`}>{s}</span>;
};

function HistoricoAusencias() {
  const { register, handleSubmit, watch } = useForm();
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  const onBuscar = async (data) => {
    setBuscando(true);
    try {
      const { ausencias, creditos } = await getExtratoFiltrado({
        funcionarioId: data.funcionario_id || null,
        dataInicio: data.data_inicio || null,
        dataFim: data.data_fim || null
      });

      // Unifica as listas para exibir cronologicamente
      const listaUnificada = [
        ...ausencias.map(a => ({ ...a, origem: 'Débito', data_ref: a.data_inicio })),
        ...creditos.map(c => ({ ...c, origem: 'Crédito', data_ref: c.data_lancamento, status: 'Concluído' }))
      ].sort((a, b) => new Date(b.data_ref) - new Date(a.data_ref)); // Mais recente primeiro

      setResultados(listaUnificada);
    } catch (error) {
      toast.error("Erro ao buscar dados.");
    } finally {
      setBuscando(false);
    }
  };

  const handleDownload = async (path) => {
    if(!path) return;
    const toastId = toast.loading("Baixando...");
    try {
      const url = await getAnexoAusenciaDownloadUrl(path);
      window.open(url, '_blank');
      toast.dismiss(toastId);
    } catch (e) { toast.error("Erro no download", { id: toastId }); }
  };

  return (
    <div className="historico-wrapper">
      {/* Barra de Filtros */}
      <form onSubmit={handleSubmit(onBuscar)} className="historico-filtros">
        <div className="filtro-group">
          <label>Colaborador</label>
          <select {...register('funcionario_id')}>
            <option value="">Todos</option>
            {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
          </select>
        </div>
        <div className="filtro-group">
          <label>De</label>
          <input type="date" {...register('data_inicio')} />
        </div>
        <div className="filtro-group">
          <label>Até</label>
          <input type="date" {...register('data_fim')} />
        </div>
        <button type="submit" className="btn-buscar" disabled={buscando}>
          {buscando ? 'Filtrando...' : 'Filtrar'}
        </button>
      </form>

      {/* Tabela de Resultados */}
      <div className="tabela-container">
        {!resultados ? (
          <div className="empty-state">Utilize os filtros acima para buscar o histórico.</div>
        ) : resultados.length === 0 ? (
          <div className="empty-state">Nenhum registro encontrado neste período.</div>
        ) : (
          <table className="historico-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Colaborador</th>
                <th>Operação</th>
                <th>Detalhe</th>
                <th>Status</th>
                <th>Anexo</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((item) => (
                <tr key={item.id} className={item.origem === 'Crédito' ? 'row-credito' : ''}>
                  <td>{fmtData(item.data_ref)}</td>
                  <td>
                    <div className="user-cell">
                      <img src={item.funcionarios?.avatar_url || 'https://ui-avatars.com/api/?name=' + item.funcionarios?.nome_completo} className="avatar-mini" />
                      <span>{item.funcionarios?.nome_completo}</span>
                    </div>
                  </td>
                  <td className={item.origem === 'Crédito' ? 'text-green' : 'text-red'}>
                    {item.origem === 'Crédito' ? `+ ${item.quantidade} ${item.unidade}` : item.tipo}
                  </td>
                  <td>
                    {item.origem === 'Débito' 
                      ? `${item.quantidade} dias (${fmtData(item.data_inicio)} - ${fmtData(item.data_fim)})` 
                      : item.motivo}
                  </td>
                  <td>{fmtStatus(item.status)}</td>
                  <td>
                    {item.anexo_path && (
                      <button type="button" className="btn-icon-sm" onClick={() => handleDownload(item.anexo_path)}>
                        <span className="material-symbols-outlined">attach_file</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default HistoricoAusencias;