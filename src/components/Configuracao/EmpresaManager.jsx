// src/components/Configuracao/EmpresaManager.jsx
import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm, Controller } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { getEmpresas, createEmpresa, updateEmpresa, deleteEmpresa } from '../../services/empresaService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import './Configuracao.css'; 

function EmpresaManager({ onBack }) {
  const { data: empresas, isLoading } = useSWR('getEmpresas', getEmpresas);
  const { mutate } = useSWRConfig();
  const { user } = useAuth(); 
  
  const [view, setView] = useState('list'); 
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
        // Atualizar
        await updateEmpresa(editingEmpresa.id, data);
        toast.success('Empresa atualizada!');
      } else {
        // Criar Nova
        const novaEmpresa = await createEmpresa(data);
        
        // Cria a associação (vínculo) automaticamente para relatórios
        if (novaEmpresa && user) {
           const { error: vinculoError } = await supabase
             .from('usuarios_empresas')
             .insert([{
               user_id: user.id,
               empresa_id: novaEmpresa.id,
               role: 'admin', // Define como admin por padrão
               nome_exibicao: user.user_metadata?.nome_completo || 'Admin',
               email_exibicao: user.email
             }]);
             
           if (vinculoError) {
             console.warn('Aviso: Empresa criada, mas falha ao criar associação:', vinculoError);
             // Não lançamos erro aqui para não travar o fluxo, pois o sistema é Single-Tenant
           }
        }
        toast.success('Empresa cadastrada com sucesso!');
      }
      mutate('getEmpresas');
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

  // --- RENDER: LISTA ---
  if (view === 'list') {
    return (
      <div className="config-module-container">
        <div className="config-header">
          <div className="header-left">
            <button onClick={onBack} className="btn-back">&larr;</button>
            <div>
              <h2>Empresas (Cadastro Interno)</h2>
              <p>Gerencie as empresas para fins de relatório e associação.</p>
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
                <div className="info-row">
                  <span className="material-symbols-outlined">person</span>
                  <span>{emp.nome_responsavel || 'Sem responsável'}</span>
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
          Tem certeza? Isso removerá a empresa dos relatórios e desvinculará os dados associados.
        </ModalConfirmacao>
      </div>
    );
  }

  // --- RENDER: FORMULÁRIO ---
  return (
    <div className="config-module-container">
      <div className="config-header">
        <h2>{editingEmpresa ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}</h2>
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="config-form">
        
        <h4 className="form-section-title">Dados da Empresa</h4>
        <div className="form-grid">
          <div className="form-group span-2">
            <label>Nome da Empresa</label>
            <input {...register('nome_fantasia', { required: true })} placeholder="Digite o nome da empresa" />
          </div>
          <div className="form-group">
            <label>CNPJ</label>
            <Controller
              name="cnpj"
              control={control}
              render={({ field }) => (
                <IMaskInput
                  mask="00.000.000/0000-00"
                  {...field}
                  placeholder="00.000.000/0000-00"
                  className="imask-input"
                />
              )}
            />
          </div>
          <div className="form-group">
            <label>Telefone</label>
            <Controller
              name="telefone"
              control={control}
              render={({ field }) => (
                <IMaskInput
                  mask="(00) 00000-0000"
                  {...field}
                  placeholder="(00) 00000-0000"
                  className="imask-input"
                />
              )}
            />
          </div>
          <div className="form-group span-2">
            <label>E-mail</label>
            <input {...register('email_contato')} placeholder="contato@empresa.com" type="email" />
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
                <IMaskInput mask="00000-000" {...field} placeholder="00000-000" className="imask-input" />
              )}
            />
          </div>
          <div className="form-group span-2">
            <label>Logradouro</label>
            <input {...register('logradouro')} placeholder="Rua, Avenida..." />
          </div>
          <div className="form-group">
            <label>Número</label>
            <input {...register('numero')} placeholder="123" />
          </div>
          <div className="form-group span-2">
            <label>Complemento</label>
            <input {...register('complemento')} placeholder="Apto, Bloco" />
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
            <input {...register('estado')} placeholder="SP" maxLength={2} />
          </div>
        </div>

        <h4 className="form-section-title">Contato do Responsável</h4>
        <div className="form-grid">
          <div className="form-group span-2">
            <label>Nome do Responsável</label>
            <input {...register('nome_responsavel')} />
          </div>
          <div className="form-group">
            <label>E-mail do Responsável</label>
            <input {...register('email_responsavel')} type="email" />
          </div>
          <div className="form-group">
            <label>Telefone do Responsável</label>
            <input {...register('telefone_responsavel')} />
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