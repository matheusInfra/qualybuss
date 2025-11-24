import React, { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm, Controller } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } from '../../services/empresaService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import './Configuracao.css';

function EmpresaManager() {
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);
  const { mutate } = useSWRConfig();
  const { user } = useAuth();
  
  // Estado para controlar qual empresa está selecionada (Detail View)
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('new'); 
  const [deleteModal, setDeleteModal] = useState(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [filterTerm, setFilterTerm] = useState('');

  const { control, register, handleSubmit, reset, setValue } = useForm();

  // Filtro da lista lateral
  const filteredEmpresas = empresas?.filter(e => 
    e.nome_fantasia.toLowerCase().includes(filterTerm.toLowerCase()) ||
    (e.cnpj && e.cnpj.includes(filterTerm))
  ) || [];

  // Quando clica em um item da lista
  const handleSelectEmpresa = (empresa) => {
    setSelectedEmpresaId(empresa.id);
    reset(empresa); // Preenche o formulário
  };

  // Quando clica no botão "+"
  const handleNew = () => {
    setSelectedEmpresaId('new');
    reset({
      nome_fantasia: '',
      razao_social: '',
      cnpj: '',
      logradouro: '',
      // ...limpar outros campos se necessário
    });
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado.');
        return;
      }
      setValue('logradouro', data.logradouro);
      setValue('bairro', data.bairro);
      setValue('cidade', data.localidade);
      setValue('estado', data.uf);
      setTimeout(() => document.getElementById('campo-numero')?.focus(), 100);
    } catch (error) {
      toast.error('Erro ao buscar CEP.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSave = async (data) => {
    const toastId = toast.loading('Salvando...');
    try {
      const payload = { ...data, data_fundacao: data.data_fundacao || null };

      if (selectedEmpresaId !== 'new') {
        await updateEmpresa(selectedEmpresaId, payload);
        toast.success('Empresa atualizada!', { id: toastId });
      } else {
        const novaEmpresa = await createEmpresa(payload);
        // Vínculo Automático
        if (novaEmpresa && user) {
           await supabase.from('usuarios_empresas').insert([{
             user_id: user.id,
             empresa_id: novaEmpresa.id,
             role: 'admin',
             nome_exibicao: user.user_metadata?.nome_completo || 'Admin',
             email_exibicao: user.email
           }]);
        }
        toast.success('Empresa criada!', { id: toastId });
        handleSelectEmpresa(novaEmpresa); // Seleciona a nova
      }
      mutate('getEmpresas');
    } catch (error) {
      toast.error('Erro: ' + error.message, { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteEmpresa(deleteModal.id);
      mutate('getEmpresas');
      toast.success('Empresa removida.');
      setDeleteModal(null);
      handleNew(); // Volta para tela de nova
    } catch (error) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  return (
    <div className="config-split-layout">
      {/* SIDEBAR: Lista de Empresas */}
      <div className="config-list-sidebar">
        <div className="list-header">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Unidades</h3>
            <button className="btn-icon" onClick={handleNew} title="Nova Unidade">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          <div className="list-search-wrapper">
            <span className="material-symbols-outlined list-search-icon">search</span>
            <input 
              className="list-search-input" 
              placeholder="Buscar por Nome ou CNPJ" 
              value={filterTerm}
              onChange={e => setFilterTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="list-items-container">
          {filteredEmpresas.map(emp => (
            <div 
              key={emp.id} 
              className={`list-item ${selectedEmpresaId === emp.id ? 'active' : ''}`}
              onClick={() => handleSelectEmpresa(emp)}
            >
              <div style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <div style={{width:'40px', height:'40px', background:'#e0f2fe', color:'#005A9C', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                  <span className="material-symbols-outlined">business</span>
                </div>
                <div className="item-main">
                  <h4>{emp.nome_fantasia}</h4>
                  <p className="item-sub">{emp.cnpj || 'CNPJ Pendente'}</p>
                </div>
              </div>
              <span className="material-symbols-outlined" style={{color:'#9ca3af'}}>chevron_right</span>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN: Formulário de Detalhes */}
      <div className="config-detail-view">
        <div className="detail-header">
          <div className="detail-title">
            <h2>{selectedEmpresaId === 'new' ? 'Nova Unidade' : 'Editar Unidade'}</h2>
            <p className="detail-subtitle">
              {selectedEmpresaId === 'new' ? 'Preencha os dados para cadastrar uma nova filial ou matriz.' : 'Gerencie os dados cadastrais e fiscais desta unidade.'}
            </p>
          </div>
          {selectedEmpresaId !== 'new' && (
            <button 
              type="button" 
              className="btn-danger" 
              onClick={() => setDeleteModal(empresas.find(e => e.id === selectedEmpresaId))}
            >
              Excluir Unidade
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(handleSave)}>
          {/* Informações Gerais */}
          <div className="detail-card">
            <h3>Informações Gerais</h3>
            <div className="erp-grid">
              <div className="erp-group col-span-2">
                <label>Razão Social</label>
                <input className="erp-input" {...register('razao_social')} placeholder="Razão Social Ltda." />
              </div>
              <div className="erp-group">
                <label>Nome Fantasia *</label>
                <input className="erp-input" {...register('nome_fantasia', { required: true })} />
              </div>
              <div className="erp-group">
                <label>CNPJ</label>
                <Controller
                  name="cnpj"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput className="erp-input" mask="00.000.000/0000-00" {...field} placeholder="00.000.000/0000-00" />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="detail-card">
            <h3>Endereço</h3>
            <div className="erp-grid">
              <div className="erp-group">
                <label>CEP {buscandoCep && '(Buscando...)'}</label>
                <Controller
                  name="cep"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput className="erp-input" mask="00000-000" {...field} onBlur={(e) => { field.onBlur(e); handleCepBlur(e); }} />
                  )}
                />
              </div>
              <div className="erp-group">
                <label>Logradouro</label>
                <input className="erp-input" {...register('logradouro')} />
              </div>
              <div className="erp-group">
                <label>Número</label>
                <input id="campo-numero" className="erp-input" {...register('numero')} />
              </div>
              <div className="erp-group">
                <label>Complemento</label>
                <input className="erp-input" {...register('complemento')} />
              </div>
              <div className="erp-group">
                <label>Bairro</label>
                <input className="erp-input" {...register('bairro')} />
              </div>
              <div className="erp-group">
                <label>Cidade</label>
                <input className="erp-input" {...register('cidade')} />
              </div>
              <div className="erp-group">
                <label>UF</label>
                <input className="erp-input" {...register('estado')} maxLength={2} />
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="detail-card">
            <h3>Contato</h3>
            <div className="erp-grid">
              <div className="erp-group">
                <label>Telefone Principal</label>
                <Controller
                  name="telefone"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput className="erp-input" mask="(00) 0000-0000" {...field} />
                  )}
                />
              </div>
              <div className="erp-group">
                <label>E-mail de Contato</label>
                <input className="erp-input" type="email" {...register('email_contato')} />
              </div>
            </div>
          </div>

          <div className="erp-actions">
             <button type="button" className="btn-secondary" style={{background:'transparent', border:'1px solid #ccc', padding:'10px 20px', borderRadius:'6px', cursor:'pointer'}} onClick={handleNew}>Cancelar</button>
             <button type="submit" className="btn-primary">Salvar Alterações</button>
          </div>
        </form>
      </div>

      <ModalConfirmacao 
        isOpen={!!deleteModal} 
        onClose={() => setDeleteModal(null)} 
        onConfirm={handleDelete} 
        title="Excluir Empresa"
      >
        Tem certeza? Dados vinculados serão perdidos.
      </ModalConfirmacao>
    </div>
  );
}

export default EmpresaManager;