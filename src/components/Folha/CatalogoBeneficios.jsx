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
  
  const [funcionarios, setFuncionarios] = useState([]); // Lista completa da empresa
  const [selectedFuncs, setSelectedFuncs] = useState([]); // IDs selecionados
  const [searchTerm, setSearchTerm] = useState(''); // Filtro local do modal

  // Form Novo Modelo
  const [newItem, setNewItem] = useState({ 
    nome: '', 
    tipo: 'Desconto', 
    tipo_valor: 'Fixo', 
    valor_padrao: '',
    descricao: ''
  });

  // Carrega catálogo ao mudar a empresa
  useEffect(() => {
    if (empresaId) carregarCatalogo();
  }, [empresaId]);

  const carregarCatalogo = async () => {
    try {
      const data = await getCatalogoBeneficios(empresaId);
      setCatalogo(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar catálogo.");
    }
  };

  const handleCriarModelo = async (e) => {
    e.preventDefault();
    if (!empresaId) return toast.error("Selecione uma empresa antes de criar.");
    if (!newItem.nome || !newItem.valor_padrao) return toast.error("Preencha os campos obrigatórios.");
    
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
      console.error(err);
      toast.error("Erro ao criar modelo."); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- LÓGICA DE DISTRIBUIÇÃO ---

  const handleOpenDistribuir = async (beneficio) => {
    if (!empresaId) return toast.error("Selecione uma empresa no topo da página.");
    
    setSelectedBeneficio(beneficio);
    setLoading(true);
    try {
      // Busca TODOS os ativos da empresa (limit alto para trazer todos)
      const resultado = await getFuncionarios({ 
        limit: 2000, 
        status: 'Ativo', 
        empresaId: empresaId 
      });
      
      // Verifica se retornou dados
      const listaFuncionarios = resultado.data || [];
      
      if (listaFuncionarios.length === 0) {
        toast('Nenhum funcionário ativo encontrado nesta empresa.', { icon: '⚠️' });
      }

      setFuncionarios(listaFuncionarios);
      setSelectedFuncs([]); // Reseta seleção
      setSearchTerm('');    // Reseta busca
      setShowModal(true);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar lista de colaboradores.");
    } finally {
      setLoading(false);
    }
  };

  // Filtro Local no Modal (Performance UX)
  const funcionariosFiltrados = useMemo(() => {
    if (!searchTerm) return funcionarios;
    const lowerTerm = searchTerm.toLowerCase();
    return funcionarios.filter(f => 
      f.nome_completo.toLowerCase().includes(lowerTerm) ||
      (f.cargo && f.cargo.toLowerCase().includes(lowerTerm)) ||
      (f.departamento && f.departamento.toLowerCase().includes(lowerTerm))
    );
  }, [funcionarios, searchTerm]);

  // Selecionar Todos (Apenas os filtrados na tela)
  const toggleSelectAll = () => {
    const idsVisiveis = funcionariosFiltrados.map(f => f.id);
    const todosVisiveisJaSelecionados = idsVisiveis.every(id => selectedFuncs.includes(id));

    if (todosVisiveisJaSelecionados) {
      // Remove os visíveis da seleção
      setSelectedFuncs(prev => prev.filter(id => !idsVisiveis.includes(id)));
    } else {
      // Adiciona os visíveis que ainda não estavam selecionados
      const novosIds = idsVisiveis.filter(id => !selectedFuncs.includes(id));
      setSelectedFuncs(prev => [...prev, ...novosIds]);
    }
  };

  const handleConfirmarDistribuicao = async () => {
    if (selectedFuncs.length === 0) return toast.error("Selecione pelo menos um colaborador.");
    
    const confirmacao = window.confirm(`Deseja atribuir "${selectedBeneficio.nome}" para ${selectedFuncs.length} colaboradores?`);
    if (!confirmacao) return;

    setLoading(true);
    try {
      await distribuirBeneficio(selectedBeneficio, selectedFuncs);
      toast.success(`Benefício aplicado para ${selectedFuncs.length} colaboradores!`);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro na distribuição.");
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
      {/* Sidebar: Cadastro */}
      <div className="catalogo-sidebar">
        <div className="sidebar-header">
          <span className="material-symbols-outlined">library_add</span>
          <h3>Novo Modelo</h3>
        </div>
        
        <form onSubmit={handleCriarModelo} className="form-catalogo">
          <div className="form-group">
            <label>Nome do Benefício</label>
            <input value={newItem.nome} onChange={e=>setNewItem({...newItem, nome: e.target.value})} placeholder="Ex: GymPass" required />
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
              <p>Nenhum modelo cadastrado nesta empresa.</p>
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

      {/* MODAL DE DISTRIBUIÇÃO */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title">
                <span className="material-symbols-outlined">diversity_3</span>
                <div>
                  <h4>Distribuir: {selectedBeneficio?.nome}</h4>
                  <p>Selecione os colaboradores para aplicar este benefício.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              {/* Barra de Filtro e Checkbox All */}
              <div className="filter-bar">
                <div className="input-search">
                  <span className="material-symbols-outlined">search</span>
                  <input 
                    type="text" 
                    placeholder="Filtrar por nome, cargo..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
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
                  <span>Selecionar Visíveis</span>
                </label>
                <span className="count-badge">{selectedFuncs.length} selecionados</span>
              </div>
              
              {/* Lista com Scroll */}
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
                {loading ? 'Processando...' : 'Confirmar Associação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}