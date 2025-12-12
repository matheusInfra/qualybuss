import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { parseArquivoPonto } from '../utils/pontoParser';
import { calcularSaldoDia } from '../utils/calculadoraPonto'; // Novo utilitário
import { salvarImportacaoPonto, getJornadas, createJornada, vincularJornada } from '../services/pontoService';
import './ImportadorPage.css'; // Reutilizando CSS existente

export default function PontoPage() {
  const [activeTab, setActiveTab] = useState('importacao');
  const [file, setFile] = useState(null);
  const [batidas, setBatidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Estados para Jornadas
  const [novaJornada, setNovaJornada] = useState({ descricao: '', entrada_1: '08:00', saida_1: '12:00', entrada_2: '13:00', saida_2: '17:00' });
  const [vinculo, setVinculo] = useState({ funcionarioId: '', jornadaId: '' });

  // Buscas
  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);
  const { data: jornadas, mutate: mutateJornadas } = useSWR('getJornadas', getJornadas);

  // --- LÓGICA DE IMPORTAÇÃO ---
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setLoading(true);
    
    try {
      const dadosBrutos = await parseArquivoPonto(selectedFile);
      
      // Match de PIS
      const dadosProcessados = dadosBrutos.map(b => {
        const func = funcionarios?.find(f => f.pis && f.pis.replace(/\D/g,'') === b.pis);
        return {
          ...b,
          funcionario_id: func?.id || null,
          nome: func?.nome_completo || 'Desconhecido',
          // Simulando que já temos a jornada carregada no funcionário (em produção, viria do banco)
          jornada_id: func?.jornada_id 
        };
      });

      setBatidas(dadosProcessados);
      setStep(2);
      toast.success(`${dadosProcessados.length} batidas lidas!`);
    } catch (err) {
      toast.error("Erro ao ler arquivo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    setLoading(true);
    try {
      // 1. Agrupar por Dia e Funcionário para calcular o Espelho
      // Este passo é crucial para gerar o 'ponto_resumo_diario'
      const resumoMap = {}; // Chave: funcId_data

      batidas.forEach(b => {
        if (!b.funcionario_id) return;
        const dataStr = b.data_hora.split('T')[0];
        const key = `${b.funcionario_id}_${dataStr}`;
        
        if (!resumoMap[key]) resumoMap[key] = { funcionario_id: b.funcionario_id, data: dataStr, batidas: [] };
        resumoMap[key].batidas.push(b);
      });

      const listaResumo = Object.values(resumoMap).map(item => {
        // Encontra a jornada do funcionário (se tiver)
        // OBS: Aqui estamos simplificando pegando a primeira jornada da lista se não tiver vinculo direto, para teste
        const jornada = jornadas?.[0]; // Em produção: buscar pelo item.funcionario_id
        const calculo = calcularSaldoDia(item.batidas, jornada);
        
        return {
          funcionario_id: item.funcionario_id,
          data: item.data,
          horas_trabalhadas: calculo.trabalhado, // em minutos (banco precisa aceitar int ou interval)
          saldo_minutos: calculo.saldo,
          status: calculo.status
        };
      });

      const dataRef = batidas[0]?.data_hora?.split('T')[0].substring(0, 7) || new Date().toISOString().substring(0, 7);

      await salvarImportacaoPonto({
        nome_arquivo: file.name,
        periodo_referencia: dataRef
      }, batidas, listaResumo);

      toast.success("Importação e Cálculo concluídos!");
      setStep(1);
      setBatidas([]);
      setFile(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE JORNADAS ---
  const handleCriarJornada = async () => {
    try {
      await createJornada(novaJornada);
      mutateJornadas();
      toast.success("Jornada criada!");
    } catch (e) { toast.error("Erro ao criar jornada"); }
  };

  const handleVincular = async () => {
    if (!vinculo.funcionarioId || !vinculo.jornadaId) return;
    try {
      await vincularJornada(vinculo.funcionarioId, vinculo.jornadaId);
      toast.success("Vínculo atualizado!");
    } catch (e) { toast.error("Erro ao vincular"); }
  };

  return (
    <div className="importador-page-wrapper">
      <div className="importador-header">
        <h1>Gestão de Ponto Eletrônico</h1>
        <p>Central de batidas e controle de jornadas.</p>
      </div>

      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'importacao' ? 'active' : ''}`} onClick={() => setActiveTab('importacao')}>
          <span className="material-symbols-outlined">upload_file</span> Importação (AFD)
        </button>
        <button className={`tab-btn ${activeTab === 'jornadas' ? 'active' : ''}`} onClick={() => setActiveTab('jornadas')}>
          <span className="material-symbols-outlined">schedule</span> Configurar Jornadas
        </button>
      </div>

      <div className="tab-content-area" style={{borderRadius: '0 0 12px 12px'}}>
        
        {/* ABA IMPORTAÇÃO */}
        {activeTab === 'importacao' && (
          <>
            {step === 1 && (
              <div className="dropzone-area fade-in">
                <input type="file" accept=".txt" onChange={handleFileChange} />
                <label className="upload-label">
                  <span className="material-symbols-outlined icon-upload">access_time</span>
                  <span className="upload-text">Upload Arquivo de Ponto (AFD)</span>
                  <span className="upload-subtext">O sistema calculará atrasos e extras automaticamente baseados nas jornadas.</span>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="fade-in">
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                  <h3>Pré-visualização ({batidas.length} registros)</h3>
                  <div style={{display:'flex', gap:'10px'}}>
                    <button className="btn-secondary" onClick={() => setStep(1)}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSalvar} disabled={loading}>
                      {loading ? 'Processando Cálculos...' : 'Confirmar e Calcular'}
                    </button>
                  </div>
                </div>
                {/* Tabela simples de preview */}
                <div style={{maxHeight: '400px', overflowY: 'auto', border: '1px solid #e2e8f0'}}>
                  <table style={{width: '100%', fontSize: '0.9rem'}}>
                    <thead style={{background: '#f8fafc', position: 'sticky', top: 0}}>
                      <tr><th>Data/Hora</th><th>PIS</th><th>Colaborador</th></tr>
                    </thead>
                    <tbody>
                      {batidas.slice(0, 50).map((b, i) => (
                        <tr key={i}>
                          <td style={{padding:8}}>{new Date(b.data_hora).toLocaleString()}</td>
                          <td style={{padding:8}}>{b.pis}</td>
                          <td style={{padding:8, color: b.funcionario_id ? 'green' : 'red'}}>{b.nome}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* ABA JORNADAS */}
        {activeTab === 'jornadas' && (
          <div className="fade-in">
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
              
              {/* Card Criar Jornada */}
              <div style={{background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                <h3 style={{marginTop:0}}>Criar Nova Jornada</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  <input placeholder="Descrição (Ex: Comercial)" value={novaJornada.descricao} onChange={e => setNovaJornada({...novaJornada, descricao: e.target.value})} style={{padding:8}} />
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                    <input type="time" value={novaJornada.entrada_1} onChange={e => setNovaJornada({...novaJornada, entrada_1: e.target.value})} />
                    <input type="time" value={novaJornada.saida_1} onChange={e => setNovaJornada({...novaJornada, saida_1: e.target.value})} />
                    <input type="time" value={novaJornada.entrada_2} onChange={e => setNovaJornada({...novaJornada, entrada_2: e.target.value})} />
                    <input type="time" value={novaJornada.saida_2} onChange={e => setNovaJornada({...novaJornada, saida_2: e.target.value})} />
                  </div>
                  <button className="btn-primary" onClick={handleCriarJornada} style={{marginTop:10}}>Salvar Jornada</button>
                </div>
              </div>

              {/* Card Vincular */}
              <div style={{background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                <h3 style={{marginTop:0}}>Vincular Colaborador</h3>
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  <select onChange={e => setVinculo({...vinculo, funcionarioId: e.target.value})} style={{padding:8}}>
                    <option value="">Selecione o Colaborador...</option>
                    {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
                  </select>
                  <select onChange={e => setVinculo({...vinculo, jornadaId: e.target.value})} style={{padding:8}}>
                    <option value="">Selecione a Jornada...</option>
                    {jornadas?.map(j => <option key={j.id} value={j.id}>{j.descricao}</option>)}
                  </select>
                  <button className="btn-primary" onClick={handleVincular} style={{marginTop:10}}>Salvar Vínculo</button>
                </div>
              </div>

            </div>

            {/* Lista de Jornadas Existentes */}
            <h3 style={{marginTop: '30px'}}>Jornadas Cadastradas</h3>
            <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
              {jornadas?.map(j => (
                <div key={j.id} style={{padding: '15px', border: '1px solid #cbd5e1', borderRadius: '8px', minWidth: '200px', background: 'white'}}>
                  <strong>{j.descricao}</strong>
                  <div style={{fontSize: '0.9rem', color: '#64748b', marginTop: '5px'}}>
                    {j.entrada_1} - {j.saida_1} / {j.entrada_2} - {j.saida_2}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}