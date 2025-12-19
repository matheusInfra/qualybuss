import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getCatalogoBeneficios, criarItemCatalogo, distribuirBeneficio } from '../../services/beneficioService';
import { getFuncionarios } from '../../services/funcionarioService';
import './CatalogoBeneficios.css';

export default function CatalogoBeneficios({ empresaId }) {
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false); // Modal de Distribuição
  const [selectedBeneficio, setSelectedBeneficio] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedFuncs, setSelectedFuncs] = useState([]);

  // Form Novo Item
  const [newItem, setNewItem] = useState({ nome: '', tipo: 'Desconto', tipo_valor: 'Fixo', valor_padrao: '' });

  useEffect(() => {
    carregarCatalogo();
  }, [empresaId]);

  const carregarCatalogo = async () => {
    if(!empresaId) return;
    const data = await getCatalogoBeneficios(empresaId);
    setCatalogo(data || []);
  };

  const handleCriarModelo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await criarItemCatalogo({ ...newItem, empresa_id: empresaId, valor_padrao: Number(newItem.valor_padrao) });
      toast.success("Modelo criado!");
      setNewItem({ nome: '', tipo: 'Desconto', tipo_valor: 'Fixo', valor_padrao: '' });
      carregarCatalogo();
    } catch (err) { toast.error("Erro ao criar."); } 
    finally { setLoading(false); }
  };

  // --- LÓGICA DE DISTRIBUIÇÃO ---
  const handleOpenDistribuir = async (beneficio) => {
    setSelectedBeneficio(beneficio);
    setLoading(true);
    // Busca funcionários para selecionar
    const { data } = await getFuncionarios({ limit: 1000, status: 'Ativo', empresaId });
    setFuncionarios(data || []);
    setSelectedFuncs([]); // Começa vazio ou com todos? Vazio é mais seguro.
    setLoading(false);
    setShowModal(true);
  };

  const handleConfirmarDistribuicao = async () => {
    if (selectedFuncs.length === 0) return toast.error("Selecione pelo menos um colaborador.");
    
    setLoading(true);
    try {
      await distribuirBeneficio(selectedBeneficio, selectedFuncs);
      toast.success(`Benefício atribuído a ${selectedFuncs.length} colaboradores!`);
      setShowModal(false);
    } catch (err) {
      toast.error("Erro na distribuição.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedFuncs.length === funcionarios.length) setSelectedFuncs([]);
    else setSelectedFuncs(funcionarios.map(f => f.id));
  };

  const formatMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="catalogo-container fade-in">
      <div className="catalogo-sidebar">
        <h3>Novo Modelo</h3>
        <form onSubmit={handleCriarModelo} className="form-catalogo">
          <label>Nome</label>
          <input value={newItem.nome} onChange={e=>setNewItem({...newItem, nome: e.target.value})} placeholder="Ex: GymPass" required />
          
          <label>Tipo</label>
          <select value={newItem.tipo} onChange={e=>setNewItem({...newItem, tipo: e.target.value})}>
            <option value="Desconto">Desconto</option>
            <option value="Provento">Provento</option>
          </select>

          <label>Cálculo</label>
          <select value={newItem.tipo_valor} onChange={e=>setNewItem({...newItem, tipo_valor: e.target.value})}>
            <option value="Fixo">Valor Fixo (R$)</option>
            <option value="Porcentagem">Porcentagem (%)</option>
          </select>

          <label>Valor Padrão</label>
          <input type="number" step="0.01" value={newItem.valor_padrao} onChange={e=>setNewItem({...newItem, valor_padrao: e.target.value})} required />

          <button type="submit" disabled={loading} className="btn-save-modelo">
            {loading ? '...' : 'Salvar Modelo'}
          </button>
        </form>
      </div>

      <div className="catalogo-grid">
        <h3>Catálogo de Benefícios Corporativos</h3>
        <p className="hint">Estes itens podem ser atribuídos em massa aos colaboradores.</p>
        
        <div className="cards-wrapper">
          {catalogo.length === 0 && <p className="empty-msg">Nenhum modelo cadastrado.</p>}
          {catalogo.map(item => (
            <div key={item.id} className={`cat-card ${item.tipo === 'Provento' ? 'pro' : 'desc'}`}>
              <div className="cat-card-header">
                <span className="material-symbols-outlined icon">{item.tipo === 'Provento' ? 'trending_up' : 'trending_down'}</span>
                <strong>{item.nome}</strong>
              </div>
              <div className="cat-card-body">
                <span>{item.tipo_valor === 'Porcentagem' ? `${item.valor_padrao}%` : formatMoney(item.valor_padrao)}</span>
                <small>{item.tipo_valor}</small>
              </div>
              <button onClick={() => handleOpenDistribuir(item)} className="btn-distribuir">
                <span className="material-symbols-outlined">group_add</span> Distribuir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Distribuição */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h4>Atribuir: {selectedBeneficio?.nome}</h4>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="toolbar">
                <button onClick={toggleSelectAll} className="btn-link">
                  {selectedFuncs.length === funcionarios.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
                <span>{selectedFuncs.length} selecionados</span>
              </div>
              <div className="lista-selecao">
                {funcionarios.map(func => (
                  <label key={func.id} className="func-check-row">
                    <input 
                      type="checkbox" 
                      checked={selectedFuncs.includes(func.id)}
                      onChange={(e) => {
                        if(e.target.checked) setSelectedFuncs([...selectedFuncs, func.id]);
                        else setSelectedFuncs(selectedFuncs.filter(id => id !== func.id));
                      }}
                    />
                    <span>{func.nome_completo}</span>
                    <small>{func.departamento}</small>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleConfirmarDistribuicao} className="btn-confirm" disabled={loading}>
                {loading ? 'Processando...' : 'Confirmar Associação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}