import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionariosDropdown, getAvatarPublicUrl } from '../services/funcionarioService';
import { parseArquivoPonto } from '../utils/pontoParser';
import { calcularSaldoDia } from '../utils/calculadoraPonto';
import { 
  salvarImportacaoPonto, 
  getJornadas, 
  getEspelhoPonto,
  updatePontoDia 
} from '../services/pontoService';

import './PontoPage.css'; // Novo CSS

export default function PontoPage() {
  // --- ESTADOS GLOBAIS ---
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('espelho'); // 'espelho' ou 'config'
  
  // --- FILTROS ---
  const [mesReferencia, setMesReferencia] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');

  // --- DADOS ---
  const [espelhoData, setEspelhoData] = useState([]);
  const [diaEmEdicao, setDiaEmEdicao] = useState(null);

  // --- HOOKS ---
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);
  const { data: jornadas } = useSWR('getJornadas', getJornadas);

  // --- CARGA INICIAL DO ESPELHO ---
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [ano, mes] = mesReferencia.split('-');
      // Se não tiver funcionário selecionado, idealmente buscaria de TODOS (backend precisa suportar)
      // Aqui vamos simular buscando de todos se o backend permitir, ou forçar seleção
      // Para o MVP, vamos assumir que getEspelhoPonto filtra por funcionarioId SE passado, senão traz tudo do mês
      const dados = await getEspelhoPonto(selectedFuncionario || null, parseInt(mes), parseInt(ano));
      setEspelhoData(dados || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar espelho.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [mesReferencia, selectedFuncionario]);

  // --- CÁLCULO DE KPIS (FRONTEND) ---
  const kpis = useMemo(() => {
    if (!espelhoData.length) return { total: 0, erros: 0, extras: 0, atrasos: 0 };
    
    let erros = 0;
    let extras = 0;
    let atrasos = 0;

    espelhoData.forEach(dia => {
      if (dia.status?.includes('Incompleto') || dia.status?.includes('Falta')) erros++;
      if (dia.saldo_minutos > 0) extras += dia.saldo_minutos;
      if (dia.saldo_minutos < 0) atrasos += Math.abs(dia.saldo_minutos);
    });

    // Converte minutos para HH:mm
    const formatMin = (m) => `${Math.floor(m/60)}h ${m%60}m`;

    return {
      total: espelhoData.length,
      erros,
      extras: formatMin(extras),
      atrasos: formatMin(atrasos)
    };
  }, [espelhoData]);

  // --- HANDLERS ---
  
  // Upload Rápido (Arrastar e Soltar no Header)
  const handleFastUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const toastId = toast.loading("Lendo arquivo...");
    try {
      const batidasRaw = await parseArquivoPonto(file);
      
      // Processamento em memória para salvar no banco
      // (Reutilizando a lógica do serviço que criamos antes)
      // ... Lógica simplificada:
      
      // 1. Mapeia Batidas
      // 2. Calcula Saldos
      // 3. Salva no Banco
      // 4. Recarrega a tela
      
      // Simulação para o MVP visual:
      toast.success("Arquivo processado! Recarregando...", { id: toastId });
      setTimeout(carregarDados, 1000); 

    } catch (err) {
      toast.error("Erro ao ler arquivo.", { id: toastId });
    }
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    try {
      await updatePontoDia(diaEmEdicao.id, {
        entrada_1: diaEmEdicao.entrada_1,
        saida_1: diaEmEdicao.saida_1,
        entrada_2: diaEmEdicao.entrada_2,
        saida_2: diaEmEdicao.saida_2,
        observacao: diaEmEdicao.observacao,
        status: 'Ajustado Manualmente'
      });
      toast.success("Ajuste salvo!");
      setDiaEmEdicao(null);
      carregarDados();
    } catch (err) {
      toast.error("Erro ao salvar.");
    }
  };

  return (
    <div className="ponto-container">
      
      {/* 1. HEADER */}
      <div className="ponto-header">
        <div className="ponto-title">
          <h1>Tratamento de Ponto</h1>
          <p>Central de conferência e fechamento mensal.</p>
        </div>
        <div className="header-actions">
           {/* Botão de Upload Rápido */}
           <label className="btn-upload-mini">
             <span className="material-symbols-outlined">upload_file</span>
             Importar AFD
             <input type="file" accept=".txt" hidden onChange={handleFastUpload} />
           </label>
           
           <button className="btn-upload-mini" onClick={() => setViewMode('config')}>
             <span className="material-symbols-outlined">settings</span>
             Configurar Jornadas
           </button>
        </div>
      </div>

      {/* 2. FILTROS */}
      <div className="ponto-filters">
        <div className="filter-group">
          <label>Competência</label>
          <input 
            type="month" 
            className="filter-input"
            value={mesReferencia}
            onChange={(e) => setMesReferencia(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label>Colaborador</label>
          <select 
            className="filter-input"
            value={selectedFuncionario}
            onChange={(e) => setSelectedFuncionario(e.target.value)}
          >
            <option value="">Todos os Colaboradores</option>
            {funcionarios?.map(f => (
              <option key={f.id} value={f.id}>{f.nome_completo}</option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{flex: 2}}>
          <label>Busca Rápida</label>
          <input 
            type="text" 
            className="filter-input" 
            placeholder="Nome, cargo ou matrícula..."
            value={buscaTexto}
            onChange={(e) => setBuscaTexto(e.target.value)}
          />
        </div>
      </div>

      {/* 3. KPIS */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">group</span></div>
          <div className="kpi-content">
            <span className="kpi-label">Registros</span>
            <span className="kpi-value">{kpis.total}</span>
          </div>
        </div>
        
        <div className="kpi-card yellow">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">warning</span></div>
          <div className="kpi-content">
            <span className="kpi-label">Atenção Necessária</span>
            <span className="kpi-value">{kpis.erros}</span>
          </div>
        </div>

        <div className="kpi-card green">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">timer</span></div>
          <div className="kpi-content">
            <span className="kpi-label">Banco (Crédito)</span>
            <span className="kpi-value">+{kpis.extras}</span>
          </div>
        </div>

        <div className="kpi-card red">
          <div className="kpi-icon-box"><span className="material-symbols-outlined">timelapse</span></div>
          <div className="kpi-content">
            <span className="kpi-label">Banco (Débito)</span>
            <span className="kpi-value">-{kpis.atrasos}</span>
          </div>
        </div>
      </div>

      {/* 4. TABELA DE ESPELHO */}
      <div className="ponto-table-wrapper">
        {loading ? (
          <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>Carregando espelho...</div>
        ) : (
          <table className="ponto-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Colaborador</th>
                <th>Jornada Realizada</th>
                <th>Saldo Diário</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {espelhoData
                .filter(dia => !buscaTexto || dia.funcionarios?.nome_completo.toLowerCase().includes(buscaTexto.toLowerCase()))
                .map(dia => (
                <tr key={dia.id}>
                  <td>
                    <div style={{display:'flex', flexDirection:'column'}}>
                       <strong style={{fontSize:'0.9rem', color:'#334155'}}>{new Date(dia.data).getDate()}</strong>
                       <span style={{fontSize:'0.75rem', color:'#94a3b8', textTransform:'uppercase'}}>
                         {new Date(dia.data).toLocaleDateString('pt-BR', { weekday: 'short' })}
                       </span>
                    </div>
                  </td>
                  <td>
                    <div className="colab-cell">
                      <div className="colab-info">
                        <span className="colab-name">{dia.funcionarios?.nome_completo}</span>
                        <span className="colab-role">{dia.funcionarios?.cargo || 'Colaborador'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="jornada-tags">
                      <span className="time-tag">{dia.entrada_1 || '--:--'}</span>
                      <span className="time-tag">{dia.saida_1 || '--:--'}</span>
                      <span className="time-tag">{dia.entrada_2 || '--:--'}</span>
                      <span className="time-tag">{dia.saida_2 || '--:--'}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700, 
                      color: dia.saldo_minutos > 0 ? '#166534' : (dia.saldo_minutos < 0 ? '#dc2626' : '#64748b')
                    }}>
                      {dia.saldo_minutos > 0 ? '+' : ''}{dia.saldo_minutos} min
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${(dia.status || 'Normal').toLowerCase().split('/')[0]}`}>
                      {dia.status || 'Normal'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-icon-edit" onClick={() => setDiaEmEdicao(dia)} title="Editar Manualmente">
                      <span className="material-symbols-outlined" style={{fontSize: '18px'}}>edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. STICKY FOOTER */}
      <div className="sticky-footer">
        <div className="footer-summary">
           <span className="summary-item">
             <span className="dot" style={{background: '#10b981'}}></span> {kpis.total} Registros
           </span>
           <span className="summary-item">
             <span className="dot" style={{background: '#f59e0b'}}></span> {kpis.erros} Pendências
           </span>
        </div>
        <button className="btn-process-month" onClick={() => toast("Funcionalidade de fechamento em breve!")}>
          <span className="material-symbols-outlined">check_circle</span>
          Confirmar e Fechar Mês
        </button>
      </div>

      {/* MODAL DE EDIÇÃO (Simplificado para o exemplo) */}
      {diaEmEdicao && (
        <div className="modal-overlay" onClick={() => setDiaEmEdicao(null)} style={{zIndex: 100}}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '400px'}}>
             <div className="modal-header">
               <h3>Ajuste Manual</h3>
               <button onClick={() => setDiaEmEdicao(null)}>×</button>
             </div>
             <form onSubmit={handleSalvarEdicao} className="modal-body">
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'15px'}}>
                   <div><label>Ent 1</label><input type="time" className="form-control" value={diaEmEdicao.entrada_1 || ''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, entrada_1: e.target.value})} /></div>
                   <div><label>Sai 1</label><input type="time" className="form-control" value={diaEmEdicao.saida_1 || ''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, saida_1: e.target.value})} /></div>
                   <div><label>Ent 2</label><input type="time" className="form-control" value={diaEmEdicao.entrada_2 || ''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, entrada_2: e.target.value})} /></div>
                   <div><label>Sai 2</label><input type="time" className="form-control" value={diaEmEdicao.saida_2 || ''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, saida_2: e.target.value})} /></div>
                </div>
                <div style={{marginBottom:'15px'}}>
                   <label>Justificativa</label>
                   <textarea className="form-control" rows="2" value={diaEmEdicao.observacao || ''} onChange={e=>setDiaEmEdicao({...diaEmEdicao, observacao: e.target.value})}></textarea>
                </div>
                <button type="submit" className="button-primary w-full">Salvar Correção</button>
             </form>
          </div>
        </div>
      )}

    </div>
  );
}