import React, { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { getFuncionariosDropdown } from '../services/funcionarioService';
import { calcularESalvarFolha, getFolhaPagamento } from '../services/salarioService';
import './FuncionariosPage.css'; // Reutiliza CSS

export default function SalariosPage() {
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [folha, setFolha] = useState(null);
  const [loading, setLoading] = useState(false);

  const { data: funcionarios } = useSWR('getFuncionariosDropdown', getFuncionariosDropdown);

  const handleCalcular = async () => {
    if (!selectedFuncionario) return toast.error("Selecione um colaborador");
    
    setLoading(true);
    try {
      const func = funcionarios.find(f => f.id === selectedFuncionario);
      // Calcula e salva no banco
      await calcularESalvarFolha(func, mes, ano);
      // Busca o resultado formatado
      const resultado = await getFolhaPagamento(func.id, mes, ano);
      setFolha(resultado);
      toast.success("Cálculo realizado!");
    } catch (error) {
      toast.error("Erro ao calcular: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="funcionarios-container">
      <div className="page-header">
        <h1>Salários e Custos</h1>
        <p>Simulação e fechamento de folha.</p>
      </div>

      <div style={{background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px'}}>
        <div style={{display: 'flex', gap: '15px', alignItems: 'flex-end'}}>
          <div style={{flex: 1}}>
            <label style={{display:'block', marginBottom:'5px', fontWeight:'600'}}>Colaborador</label>
            <select 
              style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1'}}
              value={selectedFuncionario}
              onChange={e => setSelectedFuncionario(e.target.value)}
            >
              <option value="">Selecione...</option>
              {funcionarios?.map(f => <option key={f.id} value={f.id}>{f.nome_completo}</option>)}
            </select>
          </div>
          <div style={{width: '100px'}}>
            <label style={{display:'block', marginBottom:'5px', fontWeight:'600'}}>Mês</label>
            <input type="number" value={mes} onChange={e => setMes(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1'}} />
          </div>
          <div style={{width: '120px'}}>
            <label style={{display:'block', marginBottom:'5px', fontWeight:'600'}}>Ano</label>
            <input type="number" value={ano} onChange={e => setAno(e.target.value)} style={{width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #cbd5e1'}} />
          </div>
          <button className="btn-novo" onClick={handleCalcular} disabled={loading}>
            {loading ? 'Calculando...' : 'Calcular Folha'}
          </button>
        </div>
      </div>

      {folha && (
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
          {/* Card do Holerite */}
          <div style={{background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
            <h3>Holerite Simulado</h3>
            <table style={{width: '100%', borderCollapse: 'collapse', marginTop: '10px'}}>
              <thead>
                <tr style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
                  <th style={{padding: '8px', textAlign: 'left'}}>Descrição</th>
                  <th style={{padding: '8px', textAlign: 'right'}}>Proventos</th>
                  <th style={{padding: '8px', textAlign: 'right'}}>Descontos</th>
                </tr>
              </thead>
              <tbody>
                {folha.folha_itens?.map(item => (
                  <tr key={item.id} style={{borderBottom: '1px solid #f1f5f9'}}>
                    <td style={{padding: '8px'}}>{item.descricao}</td>
                    <td style={{padding: '8px', textAlign: 'right', color: '#16a34a'}}>
                      {item.tipo === 'Provento' ? `R$ ${item.valor.toFixed(2)}` : '-'}
                    </td>
                    <td style={{padding: '8px', textAlign: 'right', color: '#dc2626'}}>
                      {item.tipo === 'Desconto' ? `R$ ${item.valor.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{fontWeight: 'bold', background: '#f8fafc'}}>
                  <td style={{padding: '12px'}}>LÍQUIDO A RECEBER</td>
                  <td colSpan="2" style={{padding: '12px', textAlign: 'right', fontSize: '1.2rem', color: '#2563eb'}}>
                    R$ {folha.liquido_receber.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Card de Custo Empresa */}
          <div style={{background: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bae6fd'}}>
            <h3 style={{color: '#0369a1'}}>Custo Total para Empresa</h3>
            <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#0c4a6e', margin: '20px 0'}}>
              R$ {folha.custo_total_empresa.toFixed(2)}
            </div>
            <p style={{color: '#075985'}}>
              Este valor inclui Salário Bruto + FGTS + INSS Patronal + Benefícios.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}