import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm, Controller } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import { toast } from 'react-hot-toast';
// Imports para o vínculo automático
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } from '../../services/empresaService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import './Configuracao.css'; 

function EmpresaManager({ onBack }) {
  const { data: empresas, isLoading } = useSWR('getEmpresas', getEmpresas);
  const { mutate } = useSWRConfig();
  const { user } = useAuth(); // Pega o usuário logado
  
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  const { control, register, handleSubmit, reset } = useForm();

  const handleNew = () => {
    setEditingEmpresa(null);
    reset({});
    setView('form');
  };

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa);
    reset(empresa);
    setView('form');
  };

  const handleSave = async (data) => {
    try {
      if (editingEmpresa) {
        // --- ATUALIZAR ---
        await updateEmpresa(editingEmpresa.id, data);
        toast.success('Empresa atualizada!');
      } else {
        // --- CRIAR NOVA ---
        const novaEmpresa = await createEmpresa(data);
        
        // VÍNCULO AUTOMÁTICO DE ADMINISTRAÇÃO
        // (Impede que a empresa fique "órfã" sem ninguém para vê-la)
        if (novaEmpresa && user) {
           const { error: vinculoError } = await supabase
             .from('usuarios_empresas')
             .insert([{
               user_id: user.id,
               empresa_id: novaEmpresa.id,
               role: 'admin', // O criador é sempre Admin
               nome_exibicao: user.user_metadata?.nome_completo || 'Admin',
               email_exibicao: user.email
             }]);
             
           if (vinculoError) {
             console.warn('Empresa criada, mas falha no vínculo:', vinculoError);
             toast.error('Aviso: Empresa criada, mas houve erro ao vincular seu usuário.');
           } else {
             toast.success('Empresa criada e vinculada com sucesso!');
           }
        }
      }
      mutate('getEmpresas'); // Atualiza a lista
      setView('list');
    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteEmpresa(deleteModal.id);
      mutate('getEmpresas');
      toast.success('Empresa removida.');
      setDeleteModal(null);
    } catch (error) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  if (view === 'list') {
    return (
      <div className="config-module-container">
        <div className="config-header">
          <div className="header-left">
            <button onClick={onBack} className="btn-back">&larr;</button>
            <div>
              <h2>Gestão de Empresas</h2>
              <p>Cadastre as unidades de negócio para relatórios e vínculos.</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleNew}>+ Nova Empresa</button>
        </div>

        <div className="cards-grid">
          {isLoading ? <p>Carregando...</p> : empresas?.map(emp => (
            <div key={emp.id} className="info-card">
              <div className="card-header-row">
                <div className="card-icon-box" style={{background: '#e6f7ff', color: '#1890ff'}}>
                  {emp.nome_fantasia ? emp.nome_fantasia.substring(0, 2).toUpperCase() : '??'}
                </div>
                <div className="card-header-text">
                  <h3>{emp.nome_fantasia}</h3>
                  <span className="card-subtext">{emp.cnpj || 'Sem CNPJ'}</span>
                </div>
              </div>
              
              <div className="card-body-rows">
                <div className="info-row">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>{emp.cidade ? `${emp.cidade}, ${emp.estado}` : 'Local não informado'}</span>
                </div>
              </div>

              <div className="card-footer-actions">
                <button onClick={() => handleEdit(emp)}>Editar Dados</button>
                <button onClick={() => setDeleteModal(emp)} style={{color: '#e53e3e'}}>Excluir</button>
              </div>
            </div>
          ))}
        </div>

        <ModalConfirmacao 
          isOpen={!!deleteModal} 
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
          title="Excluir Empresa"
        >
          Tem certeza? Dados vinculados a esta empresa (funcionários, histórico) perderão a referência.
        </ModalConfirmacao>
      </div>
    );
  }

  return (
    <div className="config-module-container">
      <div className="config-header">
        <h2>{editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}</h2>
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="config-form">
        <h4 className="form-section-title">Dados Gerais</h4>
        <div className="form-grid">
          <div className="form-group span-2">
            <label>Nome Fantasia *</label>
            <input {...register('nome_fantasia', { required: true })} placeholder="Ex: Matriz São Paulo" />
          </div>
          <div className="form-group">
            <label>CNPJ</label>
            <Controller
              name="cnpj"
              control={control}
              render={({ field }) => (
                <IMaskInput mask="00.000.000/0000-00" {...field} placeholder="00.000.000/0000-00" className="imask-input" />
              )}
            />
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <Controller
              name="telefone"
              control={control}
              render={({ field }) => (
                <IMaskInput mask="(00) 00000-0000" {...field} placeholder="(00) 00000-0000" className="imask-input" />
              )}
            />
          </div>
        </div>

        <h4 className="form-section-title">Endereço</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>CEP</label>
            <Controller
              name="cep"
              control={control}
              render={({ field }) => (
                <IMaskInput mask="00000-000" {...field} className="imask-input" />
              )}
            />
          </div>
          <div className="form-group span-2">
            <label>Logradouro</label>
            <input {...register('logradouro')} />
          </div>
          <div className="form-group">
            <label>Número</label>
            <input {...register('numero')} />
          </div>
          <div className="form-group">
            <label>Bairro</label>
            <input {...register('bairro')} />
          </div>
          <div className="form-group">
            <label>Cidade</label>
            <input {...register('cidade')} />
          </div>
          <div className="form-group">
            <label>Estado</label>
            <input {...register('estado')} maxLength={2} placeholder="UF" />
          </div>
        </div>

        <div className="form-footer-actions">
          <button type="button" className="btn-secondary" onClick={() => setView('list')}>Cancelar</button>
          <button type="submit" className="btn-primary">Salvar Empresa</button>
        </div>
      </form>
    </div>
  );
}

export default EmpresaManager;