import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getCatalogoBeneficios, criarItemCatalogo, distribuirBeneficio } from '../../services/beneficioService';
import { getFuncionarios } from '../../services/funcionarioService';
import './CatalogoBeneficios.css';

export default function CatalogoBeneficios({ empresaId }) {
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estados do Modal de Distribuição
  const [showModal, setShowModal] = useState(false);
  const [selectedBeneficio, setSelectedBeneficio] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedFuncs, setSelectedFuncs] = useState([]);

  // Form Novo Modelo
  const [newItem, setNewItem] = useState({ 
    nome: '', 
    tipo: 'Desconto', 
    tipo_valor: 'Fixo', 
    valor_padrao: '',
    descricao: ''
  });

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

  // --- FLUXO DE DISTRIBUIÇÃO ---
  const handleOpenDistribuir = async (beneficio) => {
    setSelectedBeneficio(beneficio);
    setLoading(true);
    // Carrega lista de funcionários para o modal
    const { data } = await getFuncionarios({ limit: 1000, status: 'Ativo', empresaId });
    setFuncionarios(data || []);
    setSelectedFuncs([]);
    setLoading(false);
    setShowModal(true);
  };

  const handleConfirmarDistribuicao = async () => {
    if (selectedFuncs.length === 0) return toast.error("Selecione colaboradores.");
    
    setLoading(true);
    try {
      await distribuirBeneficio(selectedBeneficio, selectedFuncs);
      toast.success(`Benefício aplicado a ${selectedFuncs.length} colaboradores!`);
      setShowModal(false);
    } catch (err) {
      toast.error("Erro ao distribuir.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFuncs.length === funcionarios.length) setSelectedFuncs([]);
    else setSelectedFuncs(funcionarios.map(f => f.id));
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

      {/* Modal de Distribuição */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h4>Atribuir: {selectedBeneficio?.nome}</h4>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            
            <div className="modal-body">
              <div className="selection-toolbar">
                <span className="count-badge">{selectedFuncs.length} selecionados</span>
                <button onClick={toggleSelectAll} className="btn-text">
                  {selectedFuncs.length === funcionarios.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
              </div>
              
              <div className="scroll-list">
                {funcionarios.map(func => (
                  <label key={func.id} className="user-row-check">
                    <input 
                      type="checkbox" 
                      checked={selectedFuncs.includes(func.id)}
                      onChange={(e) => {
                        if(e.target.checked) setSelectedFuncs([...selectedFuncs, func.id]);
                        else setSelectedFuncs(selectedFuncs.filter(id => id !== func.id));
                      }}
                    />
                    <div className="user-info">
                      <strong>{func.nome_completo}</strong>
                      <small>{func.departamento} • {func.cargo}</small>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="modal-footer">
              <button onClick={handleConfirmarDistribuicao} className="btn-confirm" disabled={loading}>
                {loading ? 'Aplicando...' : 'Confirmar Associação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}