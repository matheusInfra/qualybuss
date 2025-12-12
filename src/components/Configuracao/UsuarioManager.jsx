import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm } from 'react-hook-form';
import { IMaskInput } from 'react-imask';
import { toast } from 'react-hot-toast';
import { getUsuariosSistema, createUsuarioVinculo, deleteUsuarioVinculo } from '../../services/usuarioService';
import { getEmpresas } from '../../services/empresaService';
import ModalConfirmacao from '../Modal/ModalConfirmacao';
import './Configuracao.css';

function UsuarioManager() {
  const { data: usuarios } = useSWR('getUsuariosSistema', getUsuariosSistema);
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);
  const { mutate } = useSWRConfig();
  
  const [selectedUserId, setSelectedUserId] = useState('new');
  const [deleteModal, setDeleteModal] = useState(null);
  const [filterTerm, setFilterTerm] = useState('');

  const { control, register, handleSubmit, reset } = useForm();

  const filteredUsers = usuarios?.filter(u => 
    (u.nome_exibicao || '').toLowerCase().includes(filterTerm.toLowerCase()) ||
    (u.email_exibicao || '').toLowerCase().includes(filterTerm.toLowerCase())
  ) || [];

  const handleSelectUser = (user) => {
    setSelectedUserId(user.id);
    reset({
      ...user,
      nome: user.nome_exibicao,
      email: user.email_exibicao
    });
  };

  const handleNew = () => {
    setSelectedUserId('new');
    reset({ nome: '', email: '', cargo: '', role: 'colaborador', telefone: '' });
  };

  const handleSave = async (data) => {
    if (selectedUserId === 'new' && data.senha !== data.confirmar_senha) {
      toast.error("Senhas não conferem!");
      return;
    }
    const toastId = toast.loading('Processando...');
    try {
      if (selectedUserId === 'new') {
        await createUsuarioVinculo({
          nome: data.nome,
          email: data.email,
          password: data.senha,
          empresa_id: data.empresa_id,
          role: data.role,
          cargo: data.cargo,
          telefone: data.telefone
        });
        toast.success('Usuário criado!', { id: toastId });
      } else {
        toast.success('Dados atualizados (Simulação)', { id: toastId });
      }
      mutate('getUsuariosSistema');
      handleNew();
    } catch (error) {
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
      handleNew();
    } catch (error) {
      toast.error('Erro: ' + error.message);
    }
  };

  // Helper para classe do badge
  const getBadgeClass = (role) => {
    if (role === 'admin') return 'admin';
    return 'ativo'; // Todo usuário que existe é considerado ativo por padrão
  };

  const getBadgeLabel = (role) => {
    if (role === 'admin') return 'Admin';
    return 'Ativo';
  };

  return (
    <div className="config-split-layout">
      <div className="config-list-sidebar">
        <div className="list-header">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0, fontSize:'1.1rem', color:'#111827'}}>Usuários</h3>
            <button className="btn-icon" onClick={handleNew} title="Novo Usuário">
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
          <div className="list-search-wrapper">
            <span className="material-symbols-outlined list-search-icon">search</span>
            <input 
              className="list-search-input" 
              placeholder="Pesquisar..." 
              value={filterTerm}
              onChange={e => setFilterTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="list-items-container">
          {filteredUsers.map(u => (
            <div 
              key={u.id} 
              className={`list-item ${selectedUserId === u.id ? 'active' : ''}`}
              onClick={() => handleSelectUser(u)}
            >
              <div style={{display:'flex', gap:'12px', alignItems:'center', overflow:'hidden'}}>
                <img 
                  src={`https://i.pravatar.cc/150?u=${u.user_id}`} 
                  alt="Avatar" 
                  style={{width:'40px', height:'40px', borderRadius:'50%'}}
                />
                <div className="item-main" style={{overflow:'hidden'}}>
                  <h4 style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{u.nome_exibicao}</h4>
                  <p className="item-sub" style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{u.email_exibicao}</p>
                </div>
              </div>
              
              {/* Badge Corrigido: Admin = Azul, Outros = Verde (Ativo) */}
              <span className={`status-badge ${getBadgeClass(u.role)}`}>
                {getBadgeLabel(u.role)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="config-detail-view">
        <div className="detail-header">
          <div className="detail-title">
            <h2>{selectedUserId === 'new' ? 'Novo Usuário' : 'Editar Usuário'}</h2>
            <p className="detail-subtitle">Gerencie as informações, função e permissões.</p>
          </div>
          {selectedUserId !== 'new' && (
            <button type="button" className="btn-danger" onClick={() => setDeleteModal(usuarios.find(u => u.id === selectedUserId))}>
              Revogar Acesso
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(handleSave)}>
          <div className="detail-card">
            <h3>Informações do Usuário</h3>
            <div className="erp-grid">
              <div className="erp-group">
                <label>Nome Completo</label>
                <input className="erp-input" {...register(selectedUserId === 'new' ? 'nome' : 'nome_exibicao')} />
              </div>
              <div className="erp-group">
                <label>Email</label>
                <input className="erp-input" type="email" {...register(selectedUserId === 'new' ? 'email' : 'email_exibicao')} disabled={selectedUserId !== 'new'} />
              </div>
              <div className="erp-group">
                <label>Cargo</label>
                <input className="erp-input" {...register('cargo')} />
              </div>
              <div className="erp-group">
                <label>Função no Sistema</label>
                <select className="erp-select" {...register('role')}>
                  <option value="colaborador">Funcionário</option>
                  <option value="gerente">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              {selectedUserId === 'new' && (
                <>
                  <div className="erp-group">
                    <label>Senha Provisória</label>
                    <input className="erp-input" type="password" {...register('senha')} />
                  </div>
                  <div className="erp-group">
                    <label>Confirmar Senha</label>
                    <input className="erp-input" type="password" {...register('confirmar_senha')} />
                  </div>
                </>
              )}

              <div className="erp-group col-span-2">
                 <label>Empresa Vinculada</label>
                 <select className="erp-select" {...register('empresa_id')} disabled={selectedUserId !== 'new'}>
                   <option value="">Selecione...</option>
                   {empresas?.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                 </select>
              </div>
            </div>
          </div>

          <div className="erp-actions">
             <button type="button" className="btn-secondary" onClick={handleNew}>Cancelar</button>
             <button type="submit" className="btn-primary">Salvar Alterações</button>
          </div>
        </form>
      </div>

      <ModalConfirmacao 
        isOpen={!!deleteModal} 
        onClose={() => setDeleteModal(null)} 
        onConfirm={handleDelete} 
        title="Revogar Acesso"
      >
        O usuário perderá o acesso imediatamente.
      </ModalConfirmacao>
    </div>
  );
}

export default UsuarioManager;