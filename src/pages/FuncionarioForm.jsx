import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  createFuncionario, 
  updateFuncionario, 
  getFuncionarioById 
} from '../services/funcionarioService';
import { useEmpresa } from '../contexts/EmpresaContext';
import AvatarUpload from '../components/Upload/AvatarUpload';
import './FuncionarioForm.css';

const FuncionarioForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { empresaSelecionada } = useEmpresa();
  const [loading, setLoading] = useState(false);
  const [fotoUrl, setFotoUrl] = useState(null);
  
  const isEditMode = !!id;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    if (isEditMode) {
      carregarDados();
    }
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const data = await getFuncionarioById(id);
      if (data) {
        // Formata datas para o input type="date"
        if (data.data_admissao) data.data_admissao = data.data_admissao.split('T')[0];
        if (data.data_nascimento) data.data_nascimento = data.data_nascimento.split('T')[0];
        
        reset(data);
        setFotoUrl(data.foto_url);
      }
    } catch (error) {
      console.error("Erro ao carregar funcionário:", error);
      toast.error("Erro ao carregar dados do funcionário.");
      // Não redireciona automaticamente para não confundir o usuário
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    if (!empresaSelecionada?.id) {
      toast.error('Selecione uma empresa primeiro.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...data,
        empresa_id: empresaSelecionada.id,
        foto_url: fotoUrl,
        salario_bruto: Number(data.salario_bruto) || 0,
        qtd_dependentes: Number(data.qtd_dependentes) || 0
      };

      if (isEditMode) {
        await updateFuncionario(id, payload);
        toast.success('Funcionário atualizado com sucesso!');
      } else {
        await createFuncionario(payload);
        toast.success('Funcionário cadastrado com sucesso!');
      }
      navigate('/funcionarios');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar funcionário.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = (url) => {
    setFotoUrl(url);
    setValue('foto_url', url, { shouldDirty: true });
  };

  if (loading && isEditMode) {
    return <div className="loading-container"><div className="spinner"></div><p>Carregando ficha...</p></div>;
  }

  return (
    <div className="form-container fade-in">
      <div className="form-header">
        <h2>{isEditMode ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
        <button type="button" className="btn-secondary" onClick={() => navigate('/funcionarios')}>
          Cancelar
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
        {/* Seção Foto */}
        <div className="form-section full-width photo-section">
          <label>Foto do Perfil</label>
          <div className="avatar-uploader-wrapper">
            <AvatarUpload 
              url={fotoUrl} 
              onUpload={handleAvatarUpload} 
              disabled={loading}
            />
          </div>
        </div>

        {/* Dados Pessoais */}
        <div className="form-section">
          <h3>Dados Pessoais</h3>
          <div className="input-group">
            <label>Nome Completo *</label>
            <input {...register('nome_completo', { required: 'Nome é obrigatório' })} />
            {errors.nome_completo && <span className="error">{errors.nome_completo.message}</span>}
          </div>
          
          <div className="row-2">
            <div className="input-group">
              <label>CPF *</label>
              <input {...register('cpf', { required: 'CPF obrigatório' })} placeholder="000.000.000-00" />
            </div>
            <div className="input-group">
              <label>Data Nascimento</label>
              <input type="date" {...register('data_nascimento')} />
            </div>
          </div>

          <div className="row-2">
            <div className="input-group">
              <label>Email Corporativo</label>
              <input type="email" {...register('email_corporativo')} />
            </div>
            <div className="input-group">
              <label>Telefone</label>
              <input {...register('telefone')} />
            </div>
          </div>
        </div>

        {/* Dados Contratuais */}
        <div className="form-section">
          <h3>Dados Contratuais</h3>
          
          <div className="row-2">
            <div className="input-group">
              <label>Cargo *</label>
              <input {...register('cargo', { required: 'Cargo obrigatório' })} />
            </div>
            <div className="input-group">
              <label>Departamento</label>
              <select {...register('departamento')}>
                <option value="">Selecione...</option>
                <option value="Administrativo">Administrativo</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Comercial">Comercial</option>
                <option value="TI">TI</option>
                <option value="Operacional">Operacional</option>
                <option value="RH">RH</option>
              </select>
            </div>
          </div>

          <div className="row-3">
            <div className="input-group">
              <label>Data Admissão *</label>
              <input type="date" {...register('data_admissao', { required: true })} />
            </div>
            <div className="input-group">
              <label>Salário Bruto (R$)</label>
              <input type="number" step="0.01" {...register('salario_bruto')} />
            </div>
            <div className="input-group">
              <label>Dependentes</label>
              <input type="number" {...register('qtd_dependentes')} />
            </div>
          </div>

          <div className="input-group">
            <label>Status</label>
            <select {...register('status')}>
              <option value="Ativo">Ativo</option>
              <option value="Férias">Férias</option>
              <option value="Afastado">Afastado</option>
              <option value="Desligado">Desligado</option>
            </select>
          </div>
        </div>

        <div className="form-actions full-width">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Dados'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FuncionarioForm;