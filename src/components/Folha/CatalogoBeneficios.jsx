import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { getCatalogoBeneficios, criarItemCatalogo, distribuirBeneficio } from '../../services/beneficioService';
import { getFuncionarios } from '../../services/funcionarioService';
import './CatalogoBeneficios.css';

export default function CatalogoBeneficios({ empresaId }) {
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados do Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedBeneficio, setSelectedBeneficio] = useState(null);
  
  const [funcionarios, setFuncionarios] = useState([]); // Lista bruta
  const [selectedFuncs, setSelectedFuncs] = useState([]); // IDs selecionados
  const [searchTerm, setSearchTerm] = useState(''); // Filtro

  // Form Novo Modelo
  const [newItem, setNewItem] = useState({ 
    nome: '', tipo: 'Desconto', tipo_valor: 'Fixo', valor_padrao: '', descricao: '' 
  });

  useEffect(() => {
    if (empresaId) carregarCatalogo();
  }, [empresaId]);

  const carregarCatalogo = async () => {
    try {
      const data = await getCatalogoBeneficios(empresaId);
      setCatalogo(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCriarModelo = async (e) => {
    e.preventDefault();
    if (!empresaId) return toast.error("Empresa não selecionada.");
    
    setLoading(true);
    try {
      await criarItemCatalogo({ 
        ...newItem, 
        empresa_id: empresaId, 
        valor_padrao: Number(newItem.valor_padrao) 
      });
      toast.success("Modelo criado!");
      setNewItem({ nome: '', tipo: 'Desconto', tipo_valor: 'Fixo', valor_padrao: '', descricao: '' });
      carregarCatalogo();
    } catch (err) { 
      toast.error("Erro ao criar."); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- LÓGICA DE DISTRIBUIÇÃO (CORRIGIDA) ---
  const handleOpenDistribuir = async (beneficio) => {
    if (!empresaId) return toast.error("Erro: ID da empresa não encontrado.");
    
    setSelectedBeneficio(beneficio);
    setLoading(true); // Mostra loading no botão ou tela
    
    try {
      // Busca TODOS os ativos (limit alto para garantir lista completa no modal)
      const response = await getFuncionarios({ 
        limit: 2000, 
        status: 'Ativo', 
        empresaId: empresaId // FUNDAMENTAL
      });
      
      // A correção principal: garantir que lemos .data do retorno paginado
      const lista = response.data || [];
      
      if (lista.length === 0) {
        toast('Nenhum funcionário ativo encontrado.', { icon: '⚠️' });
      }

      setFuncionarios(lista);
      setSelectedFuncs([]);
      setSearchTerm('');
      setShowModal(true);
    } catch (error) {
      console.error("Erro ao carregar func:", error);
      toast.error("Erro ao carregar colaboradores.");
    } finally {
      setLoading(false);
    }
  };

  // Filtro local
  const funcionariosFiltrados = useMemo(() => {
    if (!searchTerm) return funcionarios;
    const term = searchTerm.toLowerCase();
    return funcionarios.filter(f => 
      f.nome_completo.toLowerCase().includes(term) ||
      (f.cargo && f.cargo.toLowerCase().includes(term))
    );
  }, [funcionarios, searchTerm]);

  const toggleSelectAll = () => {
    const idsVisiveis = funcionariosFiltrados.map(f => f.id);
    const todosMarcados = idsVisiveis.every(id => selectedFuncs.includes(id));

    if (todosMarcados) {
      setSelectedFuncs(prev => prev.filter(id => !idsVisiveis.includes(id)));
    } else {
      setSelectedFuncs(prev => [...new Set([...prev, ...idsVisiveis])]);
    }
  };

  const handleConfirmarDistribuicao = async () => {
    if (selectedFuncs.length === 0) return toast.error("Selecione alguém.");
    
    setLoading(true);
    try {
      await distribuirBeneficio(selectedBeneficio, selectedFuncs);
      toast.success("Benefício distribuído com sucesso!");
      setShowModal(false);
    } catch (err) {
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (item) => {
    if (item.tipo_valor === 'Porcentagem') return `${item.valor_padrao}%`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor_padrao);
  };

  return (
    <div className="catalogo-wrapper fade-in">
      {/* Sidebar Cadastro */}
      <div className="catalogo-sidebar">
        <div className="sidebar-header">
          <span className="material-symbols-outlined">library_add</span>
          <h3>Novo Modelo</h3>
        </div>
        <form onSubmit={handleCriarModelo} className="form-catalogo">
          <div className="form-group">
            <label>Nome</label>
            <input value={newItem.nome} onChange={e=>setNewItem({...newItem, nome: e.target.value})} placeholder="Ex: VR" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={newItem.tipo} onChange={e=>setNewItem({...newItem, tipo: e.target.value})}>
                <option value="Desconto">Desconto</option>
                <option value="Provento">Provento</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cálculo</label>
              <select value={newItem.tipo_valor} onChange={e=>setNewItem({...newItem, tipo_valor: e.target.value})}>
                <option value="Fixo">Fixo (R$)</option>
                <option value="Porcentagem">%</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Valor</label>
            <input type="number" step="0.01" value={newItem.valor_padrao} onChange={e=>setNewItem({...newItem, valor_padrao: e.target.value})} required />
          </div>
          <button type="submit" disabled={loading} className="btn-create">{loading ? '...' : 'Salvar'}</button>
        </form>
      </div>

      {/* Grid */}
      <div className="catalogo-main">
        <div className="main-header">
          <h3>Catálogo Corporativo</h3>
          <p>Modelos cadastrados para uso em massa.</p>
        </div>
        <div className="catalogo-grid">
          {catalogo.length === 0 && <p className="empty-msg">Nenhum item.</p>}
          {catalogo.map(item => (
            <div key={item.id} className={`cat-card ${item.tipo==='Provento'?'pro':'desc'}`}>
              <div className="card-top">
                <span className="material-symbols-outlined icon">{item.tipo==='Provento'?'trending_up':'trending_down'}</span>
                <strong>{item.nome}</strong>
              </div>
              <div className="card-val">{formatValue(item)}</div>
              <button onClick={() => handleOpenDistribuir(item)} className="btn-distribuir">
                <span className="material-symbols-outlined">group_add</span> Distribuir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h4>Distribuir: {selectedBeneficio?.nome}</h4>
              <button onClick={()=>setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <div className="modal-body">
              <div className="filter-bar">
                <input 
                  className="search-input"
                  placeholder="Buscar colaborador..." 
                  value={searchTerm} 
                  onChange={e=>setSearchTerm(e.target.value)} 
                />
              </div>
              <div className="select-bar">
                <label className="check-all">
                  <input type="checkbox" onChange={toggleSelectAll} checked={funcionariosFiltrados.length>0 && funcionariosFiltrados.every(f=>selectedFuncs.includes(f.id))} />
                  Selecionar Todos Visíveis
                </label>
                <span>{selectedFuncs.length} selecionados</span>
              </div>
              <div className="list-scroll">
                {funcionariosFiltrados.map(f => (
                  <label key={f.id} className={`user-row ${selectedFuncs.includes(f.id)?'selected':''}`}>
                    <input type="checkbox" checked={selectedFuncs.includes(f.id)} onChange={e => {
                      if(e.target.checked) setSelectedFuncs([...selectedFuncs, f.id]);
                      else setSelectedFuncs(selectedFuncs.filter(id=>id!==f.id));
                    }} />
                    <div className="u-info">
                      <strong>{f.nome_completo}</strong>
                      <small>{f.cargo}</small>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleConfirmarDistribuicao} className="btn-confirm" disabled={loading || selectedFuncs.length===0}>
                Confirmar Associação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}