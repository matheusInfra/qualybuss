import React, { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getUsuariosSistema, createUsuarioVinculo } from '../../services/usuarioService';
import { getEmpresas } from '../../services/empresaService';
import './Configuracao.css';

function UsuarioManager({ onBack }) {
  const { data: usuarios, isLoading } = useSWR('getUsuariosSistema', getUsuariosSistema);
  const { data: empresas } = useSWR('getEmpresas', getEmpresas);
  const { mutate } = useSWRConfig();
  
  const [view, setView] = useState('list'); // 'list' | 'form'
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

    try {
      // Chama a função que cria Auth + Banco
      await createUsuarioVinculo({
        nome: data.nome,
        email: data.email,
        senha: data.senha,
        empresa_id: data.empresa_id,
        role: data.role
      });
      
      toast.success(`Usuário ${data.nome} criado e vinculado!`);
      mutate('getUsuariosSistema'); 
      setView('list');
    } catch (error) {
      console.error(error);
      toast.error('Erro: ' + error.message);
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
              <h2>Colaboradores (Acesso ao Sistema)</h2>
              <p>Gerencie os usuários que podem fazer login.</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleNew}>+ Novo Usuário</button>
        </div>

        <div className="cards-grid">
          {isLoading && <p>Carregando...</p>}

          {!isLoading && (!usuarios || usuarios.length === 0) && (
            <div className="user-card">
              <img src="https://i.pravatar.cc/150?u=1" alt="Avatar" className="user-avatar" />
              <h3>Ana Beatriz (Exemplo)</h3>
              <span className="user-role admin">Administrador</span>
              <span className="user-email">ana.beatriz@empresa.com</span>
            </div>
          )}
          
          {usuarios?.map(user => (
            <div key={user.id} className="user-card">
              {/* Usa o user_id (UUID) para gerar um avatar consistente */}
              <img 
                src={`https://i.pravatar.cc/150?u=${user.user_id}`} 
                alt="Avatar" 
                className="user-avatar" 
              />
              
              {/* CORREÇÃO AQUI: Usamos nome_exibicao ou convertemos o ID para string */}
              <h3>{user.nome_exibicao || `Usuário #${user.id}`}</h3>
              
              <span className={`user-role ${user.role === 'admin' ? 'admin' : 'colaborador'}`}>
                {user.role}
              </span>
              
              {/* Mostra o email salvo no vínculo ou um placeholder */}
              <span className="user-email">
                {user.email_exibicao || 'Email não registrado'}
              </span>

              <span className="user-email" style={{marginTop: '4px', fontSize: '0.8rem', color: '#999'}}>
                 Loja: {user.empresas?.nome_fantasia}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: FORMULÁRIO ---
  return (
    <div className="config-module-container">
      <div className="config-header">
        <h2>Criar Novo Usuário</h2>
        <p>Preencha as informações para adicionar um novo colaborador ao sistema.</p>
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="config-form user-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Nome Completo</label>
            <input {...register('nome')} placeholder="Insira o nome completo" required />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input {...register('email')} type="email" placeholder="ex: joao.silva@empresa.com" required />
          </div>
          
          <div className="form-group">
            <label>Senha</label>
            <input {...register('senha')} type="password" placeholder="Crie uma senha forte" required />
          </div>
          <div className="form-group">
            <label>Confirmar Senha</label>
            <input {...register('confirmar_senha')} type="password" placeholder="Repita a senha" required />
          </div>

          <div className="form-group span-2">
            <label>Empresa de Acesso</label>
            <select {...register('empresa_id')} required>
              <option value="">Selecione a empresa</option>
              {empresas?.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
              ))}
            </select>
          </div>

          <div className="form-group span-2">
            <label>Cargo / Nível de Acesso</label>
            <select {...register('role')} required>
              <option value="colaborador">Colaborador (Acesso Limitado)</option>
              <option value="gerente">Gestor (Acesso à Loja)</option>
              <option value="admin">Administrador (Acesso Total)</option>
            </select>
          </div>
        </div>

        <div className="form-footer-actions">
          <button type="button" className="btn-secondary" onClick={() => setView('list')}>Cancelar</button>
          <button type="submit" className="btn-primary">Salvar Usuário</button>
        </div>
      </form>
    </div>
  );
}

export default UsuarioManager;