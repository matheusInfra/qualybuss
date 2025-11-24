import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm } from 'react-hook-form';
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
  const { register, handleSubmit, reset } = useForm();

  const handleNew = () => {
    reset({});
    setView('form');
  };

  const handleSave = async (data) => {
    if (data.senha !== data.confirmar_senha) {
      toast.error("As senhas não coincidem!");
      return;
    }

    // Loading visual
    const toastId = toast.loading('Criando usuário e vínculo...');

    try {
      // CORREÇÃO: Mapeamos 'senha' do form para 'password' que a API espera
      await createUsuarioVinculo({
        nome: data.nome,
        email: data.email,
        password: data.senha, // <-- Mapeamento correto
        empresa_id: data.empresa_id,
        role: data.role
      });
      
      toast.success(`Usuário ${data.nome} criado com sucesso!`, { id: toastId });
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
      await deleteUsuarioVinculo(deleteModal.id); // Remove da tabela de vinculos
      mutate('getUsuariosSistema');
      toast.success('Acesso revogado com sucesso.');
      setDeleteModal(null);
    } catch (error) {
      toast.error('Erro ao remover: ' + error.message);
    }
  };

  if (view === 'list') {
    return (
      <div className="config-module-container">
        <div className="config-header">
          <div className="header-left">
            <button onClick={onBack} className="btn-back">&larr;</button>
            <div>
              <h2>Usuários do Sistema</h2>
              <p>Gerencie quem pode fazer login e seus acessos.</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleNew}>+ Novo Usuário</button>
        </div>

        <div className="cards-grid">
          {isLoading && <p>Carregando...</p>}
          
          {!isLoading && (!usuarios || usuarios.length === 0) && (
             <p style={{gridColumn: '1/-1', color: '#666'}}>Nenhum usuário adicional encontrado.</p>
          )}
          
          {usuarios?.map(user => (
            <div key={user.id} className="user-card">
              <img 
                src={`https://i.pravatar.cc/150?u=${user.user_id}`} 
                alt="Avatar" 
                className="user-avatar" 
              />
              <h3>{user.nome_exibicao || user.email_exibicao}</h3>
              
              <span className={`user-role ${user.role}`}>
                {user.role}
              </span>
              
              <span className="user-email">{user.email_exibicao}</span>
              
              <div style={{marginTop: '12px', fontSize: '0.8rem', color: '#999'}}>
                 Acesso a: <strong>{user.empresas?.nome_fantasia || 'Empresa Removida'}</strong>
              </div>

              <button 
                onClick={() => setDeleteModal(user)} 
                style={{marginTop: '16px', color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600}}
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
          O usuário perderá o acesso a esta empresa imediatamente. O login dele continuará existindo no sistema.
        </ModalConfirmacao>
      </div>
    );
  }

  return (
    <div className="config-module-container">
      <div className="config-header">
        <h2>Criar Novo Usuário</h2>
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="config-form user-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Nome Completo</label>
            <input {...register('nome')} placeholder="Ex: João Silva" required />
          </div>
          <div className="form-group">
            <label>E-mail (Login)</label>
            <input {...register('email')} type="email" placeholder="joao@empresa.com" required />
          </div>
          
          <div className="form-group">
            <label>Senha Provisória</label>
            <input {...register('senha')} type="password" placeholder="Mínimo 6 caracteres" required />
          </div>
          <div className="form-group">
            <label>Confirmar Senha</label>
            <input {...register('confirmar_senha')} type="password" required />
          </div>

          <div className="form-group span-2">
            <label>Empresa Principal</label>
            <select {...register('empresa_id')} required>
              <option value="">Selecione a empresa...</option>
              {empresas?.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
              ))}
            </select>
            <small style={{color: '#718096'}}>O usuário será vinculado a esta empresa.</small>
          </div>

          <div className="form-group span-2">
            <label>Nível de Acesso</label>
            <select {...register('role')} required>
              <option value="colaborador">Colaborador (Acesso Básico)</option>
              <option value="gerente">Gerente (Gestão de Equipe)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
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