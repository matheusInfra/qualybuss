import React, { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';

// SERVIÇOS
import { getFuncionarios } from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { getBeneficiosEmLote } from '../services/beneficioService'; // Certifique-se que este arquivo existe
import { calcularSalarioLiquido } from '../utils/calculadoraSalario';

// COMPONENTES
// Correção do Path: Assumindo que GestaoBeneficios.jsx está em src/components/
import GestaoBeneficios from '../components/GestaoBeneficios'; 
// Se estes arquivos abaixo não existirem, comente-os temporariamente
import MuralApontamentos from '../components/Folha/MuralApontamentos'; 
import CatalogoBeneficios from '../components/Folha/CatalogoBeneficios';

import './SalariosPage.css';

function SalariosPage() {
  const [activeTab, setActiveTab] = useState('folha'); 
  const [empresaId, setEmpresaId] = useState('');
  const [filtros, setFiltros] = useState({ empresa: '', departamento: '', search: '' });
  const [folhaData, setFolhaData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  const [detalheExpandido, setDetalheExpandido] = useState(null);

  // Carrega Empresas
  const { data: empresas } = useSWR('getEmpresas', getEmpresas, {
    onSuccess: (data) => { if(data?.length > 0 && !empresaId) setEmpresaId(data[0].id); }
  });

  const fetchDadosGerais = useCallback(async () => {
    if(activeTab !== 'folha') return;
    setLoading(true);
    try {
      // 1. Busca Funcionários
      const res = await getFuncionarios({
        limit: 50, // Aumentei o limite para carregar mais na tela inicial
        search: filtros.search,
        empresaId: filtros.empresa || empresaId || null, 
        departamento: filtros.departamento !== 'Todos' ? filtros.departamento : null, 
        status: 'Ativo'
      });

      const listaFuncionarios = res.data || [];
      const ids = listaFuncionarios.map(f => f.id);
      
      // 2. Busca Benefícios (Proteção se o serviço falhar)
      let mapBeneficios = {};
      try {
        if (ids.length > 0) {
          const bens = await getBeneficiosEmLote(ids);
          bens.forEach(b => { 
             if(!mapBeneficios[b.funcionario_id]) mapBeneficios[b.funcionario_id]=[]; 
             mapBeneficios[b.funcionario_id].push(b); 
          });
        }
      } catch (err) {
        console.warn("Não foi possível carregar benefícios externos, calculando apenas legal.", err);
      }

      // 3. Realiza Cálculos
      const calculados = listaFuncionarios.map(f => {
        const beneficiosFunc = mapBeneficios[f.id] || [];
        const calculo = calcularSalarioLiquido(
          Number(f.salario_bruto || 0), 
          Number(f.qtd_dependentes || 0), 
          beneficiosFunc
        );
        return { ...f, calculo };
      });

      setFolhaData(calculados);

    } catch(e) { 
      console.error(e); 
      toast.error("Erro ao processar folha.");
    } finally { 
      setLoading(false); 
    }
  }, [filtros, empresaId, activeTab]);

  useEffect(() => { fetchDadosGerais(); }, [fetchDadosGerais]);

  const fmt = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Central de Folha</h1>
          <p className="text-gray-500">Visão contratual e processamento.</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <select 
            className="p-2 border rounded bg-white shadow-sm"
            value={empresaId} 
            onChange={e=>setEmpresaId(e.target.value)}
          >
            <option value="">Todas as Empresas</option>
            {empresas?.map(e=><option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
          </select>
        </div>
      </header>

      {/* Navegação Abas */}
      <div className="flex space-x-4 border-b mb-6">
        <button className={`pb-2 px-4 ${activeTab==='folha' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`} onClick={()=>setActiveTab('folha')}>
          Visão Geral
        </button>
        <button className={`pb-2 px-4 ${activeTab==='beneficios' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`} onClick={()=>setActiveTab('beneficios')} disabled={!selectedFuncionario}>
          {selectedFuncionario ? `Benefícios: ${selectedFuncionario.nome_completo}` : 'Gestão Individual'}
        </button>
      </div>

      {/* ABA FOLHA */}
      {activeTab === 'folha' && (
        <div className="bg-white rounded shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando cálculos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salário Bruto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase">Desc. Legais</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-green-600 uppercase">Líquido Est.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-blue-600 uppercase">Custo Total</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {folhaData.map(func => (
                    <tr key={func.id} className="hover:bg-gray-50 cursor-pointer" onClick={()=>setDetalheExpandido(detalheExpandido===func.id?null:func.id)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{func.nome_completo}</div>
                        <div className="text-xs text-gray-500">{func.cargo}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">{fmt(func.calculo.salarioBruto)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-red-600">
                         - {fmt(func.calculo.inss + func.calculo.irrf)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-green-700">{fmt(func.calculo.salarioLiquido)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-blue-700">{fmt(func.calculo.custoEmpresa)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          className="text-blue-600 hover:text-blue-900 text-sm"
                          onClick={(e)=>{ e.stopPropagation(); setSelectedFuncionario(func); setActiveTab('beneficios'); }}
                        >
                          Editar Benefícios
                        </button>
                      </td>
                    </tr>
                  ))}
                  {folhaData.length === 0 && (
                    <tr><td colSpan="6" className="p-6 text-center text-gray-500">Nenhum funcionário encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA BENEFÍCIOS */}
      {activeTab === 'beneficios' && selectedFuncionario && (
        <div className="fade-in">
          <button onClick={()=>setActiveTab('folha')} className="mb-4 text-sm text-gray-600 hover:text-gray-900">← Voltar para lista</button>
          <GestaoBeneficios 
            funcionarioId={selectedFuncionario.id} // Passamos ID para o componente saber quem é
            dadosIniciais={selectedFuncionario.calculo.listaBeneficios} // Passamos o que já temos
          />
        </div>
      )}
    </div>
  );
}

export default SalariosPage;