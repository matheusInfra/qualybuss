import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { getCatalogoBeneficios, criarItemCatalogo, distribuirBeneficio } from '../../services/beneficioService';
import { getFuncionarios } from '../../services/funcionarioService';
import './CatalogoBeneficios.css';

export default function CatalogoBeneficios({ empresaId }) {
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- ESTADOS DO MODAL DE DISTRIBUIÇÃO ---
  const [showModal, setShowModal] = useState(false);
  const [selectedBeneficio, setSelectedBeneficio] = useState(null);
  
  const [funcionarios, setFuncionarios] = useState([]); // Todos os funcionários ativos
  const [selectedFuncs, setSelectedFuncs] = useState([]); // IDs selecionados
  const [searchTerm, setSearchTerm] = useState(''); // Filtro de busca

  // Form Novo Modelo
  const [newItem, setNewItem] = useState({ 
    nome: '', 
    tipo: 'Desconto', 
    tipo_valor: 'Fixo', 
    valor_padrao: '',
    descricao: ''
  });

  // Carrega catálogo ao iniciar
  useEffect(() => {
    if (empresaId) carregarCatalogo();
  }, [empresaId]);

  const carregarCatalogo = async () => {
    try {
      const data = await getCatalogoBeneficios(empresaId);
      setCatalogo(data || []);
    } catch (error) {
      toast.error("Erro ao carregar catálogo.");
    }
  };

  const handleCriarModelo = async (e) => {
    e.preventDefault();
    if (!newItem.nome || !newItem.valor_padrao) return;
    
    setLoading(true);
    try {
      await criarItemCatalogo({ 
        ...newItem, 
        empresa_id: empresaId, 
        valor_padrao: Number(newItem.valor_padrao) 
      });
      toast.success("Modelo criado com sucesso!");
      setNewItem({ nome: '', tipo: 'Desconto', tipo_valor: 'Fixo', valor_padrao: '', descricao: '' });
      carregarCatalogo();
    } catch (err) { 
      toast.error("Erro ao criar modelo."); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- LÓGICA DE DISTRIBUIÇÃO (MODAL) ---

  const handleOpenDistribuir = async (beneficio) => {
    setSelectedBeneficio(beneficio);
    setLoading(true);
    try {
      // Busca todos os funcionários ativos para popular a lista
      // Usamos limit alto para garantir que traga todos para seleção
      const { data } = await getFuncionarios({ limit: 2000, status: 'Ativo', empresaId });
      setFuncionarios(data || []);
      setSelectedFuncs([]); // Começa limpo
      setSearchTerm('');    // Limpa busca
      setShowModal(true);
    } catch (error) {
      toast.error("Erro ao carregar lista de colaboradores.");
    } finally {
      setLoading(false);
    }
  };

  // Filtragem em tempo real (Memoizado para performance)
  const funcionariosFiltrados = useMemo(() => {
    if (!searchTerm) return funcionarios;
    const lowerTerm = searchTerm.toLowerCase();
    return funcionarios.filter(f => 
      f.nome_completo.toLowerCase().includes(lowerTerm) ||
      f.cargo?.toLowerCase().includes(lowerTerm) ||
      f.departamento?.toLowerCase().includes(lowerTerm)
    );
  }, [funcionarios, searchTerm]);

  // Lógica de Selecionar Todos (Apenas os visíveis no filtro!)
  const toggleSelectAll = () => {
    const idsVisiveis = funcionariosFiltrados.map(f => f.id);
    const todosVisiveisSelecionados = idsVisiveis.every(id => selectedFuncs.includes(id));

    if (todosVisiveisSelecionados) {
      // Desmarcar todos os visíveis
      setSelectedFuncs(prev => prev.filter(id => !idsVisiveis.includes(id)));
    } else {
      // Adicionar todos os visíveis aos já selecionados (sem duplicar)
      setSelectedFuncs(prev => [...new Set([...prev, ...idsVisiveis])]);
    }
  };

  const handleConfirmarDistribuicao = async () => {
    if (selectedFuncs.length === 0) return toast.error("Selecione pelo menos um colaborador.");
    
    const confirmMsg = `Deseja atribuir "${selectedBeneficio.nome}" para ${selectedFuncs.length} colaboradores?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      await distribuirBeneficio(selectedBeneficio, selectedFuncs);
      toast.success(`Sucesso! Benefício adicionado a ${selectedFuncs.length} pessoas.`);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao distribuir benefício.");
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
      {/* Sidebar: Criação */}
      <div className="catalogo-sidebar">
        <div className="sidebar-header">
          <span className="material-symbols-outlined">library_add</span>
          <h3>Novo Modelo</h3>
        </div>
        
        <form onSubmit={handleCriarModelo} className="form-catalogo">
          <div className="form-group">
            <label>Nome do Benefício</label>
            <input value={newItem.nome} onChange={e=>setNewItem({...newItem, nome: e.target.value})} placeholder="Ex: VT 6%" required />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Tipo</label>
              <select value={newItem.tipo} onChange={e=>setNewItem({...newItem, tipo: e.target.value})}>
                <option value="Desconto">Desconto (-)</option>
                <option value="Provento">Provento (+)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cálculo</label>
              <select value={newItem.tipo_valor} onChange={e=>setNewItem({...newItem, tipo_valor: e.target.value})}>
                <option value="Fixo">Fixo (R$)</option>
                <option value="Porcentagem">% Salário</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Valor Padrão {newItem.tipo_valor === 'Porcentagem' ? '(%)' : '(R$)'}</label>
            <input type="number" step="0.01" value={newItem.valor_padrao} onChange={e=>setNewItem({...newItem, valor_padrao: e.target.value})} required />
          </div>

          <div className="form-group">
            <label>Descrição (Opcional)</label>
            <input value={newItem.descricao} onChange={e=>setNewItem({...newItem, descricao: e.target.value})} placeholder="Detalhes..." />
          </div>

          <button type="submit" disabled={loading} className="btn-create">
            {loading ? 'Salvando...' : 'Criar Modelo'}
          </button>
        </form>
      </div>

      {/* Grid: Visualização */}
      <div className="catalogo-main">
        <div className="main-header">
          <h3>Catálogo Corporativo</h3>
          <p>Modelos de benefícios para aplicação rápida em massa.</p>
        </div>
        
        <div className="catalogo-grid">
          {catalogo.length === 0 && (
            <div className="empty-state-cat">
              <span className="material-symbols-outlined">dataset</span>
              <p>Nenhum modelo cadastrado.</p>
            </div>
          )}
          
          {catalogo.map(item => (
            <div key={item.id} className={`cat-card ${item.tipo === 'Provento' ? 'provento' : 'desconto'}`}>
              <div className="card-top">
                <span className="material-symbols-outlined icon">
                  {item.tipo === 'Provento' ? 'trending_up' : 'trending_down'}
                </span>
                <span className="card-type">{item.tipo}</span>
              </div>
              
              <h4>{item.nome}</h4>
              <div className="card-value-box">
                <span className="value-big">{formatValue(item)}</span>
                <small>{item.tipo_valor === 'Porcentagem' ? 'do Salário Base' : 'Valor Fixo'}</small>
              </div>
              
              <button onClick={() => handleOpenDistribuir(item)} className="btn-distribuir">
                <span className="material-symbols-outlined">group_add</span> Distribuir em Massa
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DE DISTRIBUIÇÃO COM FILTRO */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title">
                <span className="material-symbols-outlined">diversity_3</span>
                <div>
                  <h4>Distribuir Benefício</h4>
                  <p>Item: <strong>{selectedBeneficio?.nome}</strong> ({formatValue(selectedBeneficio)})</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              {/* Barra de Filtro e Seleção */}
              <div className="filter-bar">
                <div className="input-search">
                  <span className="material-symbols-outlined">search</span>
                  <input 
                    type="text" 
                    placeholder="Filtrar por nome, cargo ou depto..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="selection-info-bar">
                <label className="checkbox-all">
                  <input 
                    type="checkbox" 
                    onChange={toggleSelectAll}
                    checked={funcionariosFiltrados.length > 0 && funcionariosFiltrados.every(f => selectedFuncs.includes(f.id))}
                  />
                  <span>Selecionar {searchTerm ? 'Filtrados' : 'Todos'}</span>
                </label>
                <span className="count-badge">
                  {selectedFuncs.length} selecionado(s)
                </span>
              </div>
              
              {/* Lista Scrollável */}
              <div className="scroll-list">
                {funcionariosFiltrados.length === 0 ? (
                  <p className="no-results">Nenhum colaborador encontrado.</p>
                ) : (
                  funcionariosFiltrados.map(func => (
                    <label key={func.id} className={`user-row-check ${selectedFuncs.includes(func.id) ? 'selected' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedFuncs.includes(func.id)}
                        onChange={(e) => {
                          if(e.target.checked) setSelectedFuncs([...selectedFuncs, func.id]);
                          else setSelectedFuncs(selectedFuncs.filter(id => id !== func.id));
                        }}
                      />
                      <div className="avatar-mini">{func.nome_completo.charAt(0)}</div>
                      <div className="user-info">
                        <strong>{func.nome_completo}</strong>
                        <small>{func.departamento} • {func.cargo}</small>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-cancel">Cancelar</button>
              <button onClick={handleConfirmarDistribuicao} className="btn-confirm" disabled={loading || selectedFuncs.length === 0}>
                {loading ? <div className="spinner-mini"></div> : <span className="material-symbols-outlined">check</span>}
                Confirmar Associação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}