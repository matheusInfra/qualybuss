import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm, Controller } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import { toast } from 'react-hot-toast';
import { getUsuariosSistema, createUsuarioVinculo, deleteUsuarioVinculo } from '../../services/usuarioService';
import { getEmpresas } from '../../services/empresaService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import './Configuracao.css';

function UsuarioManager({ onBack }) {
  const { data: usuarios, isLoading } = useSWR('getUsuariosSistema', getUsuariosSistema);
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);
  const { mutate } = useSWRConfig();
  
  const [view, setView] = useState('list');
  const [deleteModal, setDeleteModal] = useState(null);
  const { control, register, handleSubmit, reset } = useForm();

  const handleNew = () => {
    reset({});
    setView('form');
  };

  const handleSave = async (data) => {
    if (data.senha !== data.confirmar_senha) {
      toast.error("As senhas não coincidem!");
      return;
    }

    const toastId = toast.loading('Criando acesso...');

    try {
      await createUsuarioVinculo({
        nome: data.nome,
        email: data.email,
        password: data.senha,
        empresa_id: data.empresa_id,
        role: data.role,
        // Novos Campos ERP
        cargo: data.cargo,
        telefone: data.telefone
      });
      
      toast.success(`Usuário ${data.nome} criado!`, { id: toastId });
      mutate('getUsuariosSistema'); 
      setView('list');
    } catch (error) {
      console.error(error);
      toast.error('Erro: ' + error.message, { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteUsuarioVinculo(deleteModal.id);
      mutate('getUsuariosSistema');
      toast.success('Acesso revogado.');
      setDeleteModal(null);
    } catch (error) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  // --- LISTA ---
  if (view === 'list') {
    return (
      <div className="config-module-container">
        <div className="config-header">
          <div className="header-left">
            <button onClick={onBack} className="btn-back">&larr;</button>
            <div>
              <h2>Usuários do Sistema</h2>
              <p>Gerencie os logins de acesso e operadores.</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleNew}>+ Novo Usuário</button>
        </div>

        <div className="cards-grid">
          {isLoading && <p>Carregando...</p>}
          
          {!isLoading && usuarios?.length === 0 && (
             <p style={{gridColumn: '1/-1', color: '#666', textAlign: 'center', padding: '40px', border: '1px dashed #ccc', borderRadius: '8px'}}>
               Nenhum usuário adicional. Crie o primeiro operador.
             </p>
          )}
          
          {usuarios?.map(user => (
            <div key={user.id} className="user-card">
              <img 
                src={`https://i.pravatar.cc/150?u=${user.user_id}`} 
                alt="Avatar" 
                className="user-avatar" 
              />
              
              <h3 style={{marginBottom: '2px'}}>{user.nome_exibicao}</h3>
              <span style={{fontSize: '0.8rem', color: '#718096', marginBottom: '8px'}}>{user.cargo || 'Sem cargo definido'}</span>
              
              <span className={`user-role ${user.role}`}>
                {user.role === 'admin' ? 'Administrador' : user.role === 'gerente' ? 'Gerente' : 'Colaborador'}
              </span>
              
              <div style={{marginTop: '16px', width: '100%', textAlign: 'left', fontSize: '0.85rem', color: '#4a5568', borderTop: '1px solid #f0f0f0', paddingTop: '12px'}}>
                <div style={{display: 'flex', gap: '8px', marginBottom: '4px'}}>
                  <span className="material-symbols-outlined" style={{fontSize: '16px', color: '#cbd5e0'}}>mail</span>
                  {user.email_exibicao}
                </div>
                {user.telefone && (
                  <div style={{display: 'flex', gap: '8px', marginBottom: '4px'}}>
                    <span className="material-symbols-outlined" style={{fontSize: '16px', color: '#cbd5e0'}}>call</span>
                    {user.telefone}
                  </div>
                )}
                 <div style={{display: 'flex', gap: '8px'}}>
                  <span className="material-symbols-outlined" style={{fontSize: '16px', color: '#cbd5e0'}}>business</span>
                  {user.empresas?.nome_fantasia || '---'}
                </div>
              </div>

              <button 
                onClick={() => setDeleteModal(user)} 
                style={{marginTop: 'auto', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', paddingTop: '16px'}}
              >
                Revogar Acesso
              </button>
            </div>
          ))}
        </div>

        <ModalConfirmacao 
          isOpen={!!deleteModal} 
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
          title="Revogar Acesso"
        >
          O usuário perderá o acesso a esta empresa imediatamente.
        </ModalConfirmacao>
      </div>
    );
  }

  // --- FORMULÁRIO ---
  return (
    <div className="config-module-container">
      <div className="config-header">
        <h2>Novo Operador</h2>
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="config-form user-form">
        
        <h4 className="form-section-title">Dados de Acesso</h4>
        <div className="form-grid">
          <div className="form-group span-2">
            <label>E-mail (Login) *</label>
            <input {...register('email')} type="email" placeholder="usuario@empresa.com" required />
          </div>
          
          <div className="form-group">
            <label>Senha Provisória *</label>
            <input {...register('senha')} type="password" placeholder="Mínimo 6 caracteres" required />
          </div>
          <div className="form-group">
            <label>Confirmar Senha *</label>
            <input {...register('confirmar_senha')} type="password" required />
          </div>
        </div>

        <h4 className="form-section-title" style={{marginTop: '32px'}}>Perfil do Usuário</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Nome Completo *</label>
            <input {...register('nome')} placeholder="Ex: João Silva" required />
          </div>
          <div className="form-group">
            <label>Cargo / Função</label>
            <input {...register('cargo')} placeholder="Ex: Analista de RH" />
          </div>

          <div className="form-group">
            <label>Telefone / Celular</label>
            <Controller
              name="telefone"
              control={control}
              render={({ field }) => (
                <IMaskInput mask="(00) 00000-0000" {...field} placeholder="(00) 00000-0000" className="imask-input" />
              )}
            />
          </div>

          <div className="form-group">
            <label>Nível de Permissão *</label>
            <select {...register('role')} required>
              <option value="colaborador">Colaborador (Apenas Visualiza)</option>
              <option value="gerente">Gerente (Edita Dados)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
          </div>

          <div className="form-group span-2">
            <label>Empresa Vinculada *</label>
            <select {...register('empresa_id')} required>
              <option value="">Selecione a empresa...</option>
              {empresas?.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
              ))}
            </select>
            <small style={{color: '#718096'}}>O usuário terá acesso aos dados desta unidade.</small>
          </div>
        </div>

        <div className="form-footer-actions">
          <button type="button" className="btn-secondary" onClick={() => setView('list')}>Cancelar</button>
          <button type="submit" className="btn-primary">Criar Usuário</button>
        </div>
      </form>
    </div>
  );
}

export default UsuarioManager;