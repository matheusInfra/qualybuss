import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionarios } from '../../services/funcionarioService';
import { getExtratoFiltrado, getAnexoAusenciaDownloadUrl } from '../../services/ausenciaService';
import './HistoricoAusencias.css';

const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';
const fmtStatus = (s) => <span className={`status-badge ${s}`}>{s}</span>;

function HistoricoAusencias() {
  const { register, handleSubmit } = useForm();
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);

  const { data: funcionarios } = useSWR('getFuncionarios', getFuncionarios);

  const onBuscar = async (data) => {
    setBuscando(true);
    try {
      const { ausencias, creditos, periodos } = await getExtratoFiltrado({
        funcionarioId: data.funcionario_id || null,
        dataInicio: data.data_inicio || null,
        dataFim: data.data_fim || null
      });

      const listaUnificada = [
        ...ausencias.map(a => ({ ...a, origem: 'Débito', data_ref: a.data_inicio, detalhe: `${a.quantidade} dias` })),
        ...creditos.map(c => ({ ...c, origem: 'Crédito', data_ref: c.data_lancamento, status: 'Concluído', detalhe: `+${c.quantidade} ${c.unidade}` })),
        ...periodos.map(p => ({ ...p, origem: 'Direito', data_ref: p.inicio_periodo, status: 'Ativo', tipo: 'Férias (Aquisitivo)', detalhe: `+${p.dias_direito} dias` }))
      ].sort((a, b) => new Date(b.data_ref) - new Date(a.data_ref));

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
      <form onSubmit={handleSubmit(onBuscar)} className="historico-filtros">
        <div className="filtro-group">
          <label>Colaborador</label>
          <select {...register('funcionario_id')}>
            <option value="">Todos</option>
            {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
          </select>
        </div>
        <div className="filtro-group"><label>De</label><input type="date" {...register('data_inicio')} /></div>
        <div className="filtro-group"><label>Até</label><input type="date" {...register('data_fim')} /></div>
        <button type="submit" className="btn-buscar" disabled={buscando}>{buscando ? 'Filtrando...' : 'Filtrar'}</button>
      </form>

      <div className="tabela-container">
        {!resultados ? <div className="empty-state">Utilize os filtros para buscar.</div> : 
         resultados.length === 0 ? <div className="empty-state">Nenhum registro encontrado.</div> : (
          <table className="historico-table">
            <thead>
              <tr>
                <th>Data Ref.</th>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Qtd.</th>
                <th>Detalhes</th>
                <th>Status</th>
                <th>Anexo</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((item) => (
                <tr key={item.id} className={item.origem === 'Débito' ? '' : 'row-credito'}>
                  <td>{fmtData(item.data_ref)}</td>
                  <td>{item.funcionarios?.nome_completo}</td>
                  <td>{item.tipo}</td>
                  <td className={item.origem === 'Débito' ? 'text-red' : 'text-green'}>{item.detalhe}</td>
                  <td>{item.motivo || (item.origem === 'Direito' ? `Período até ${fmtData(item.fim_periodo)}` : '-')}</td>
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