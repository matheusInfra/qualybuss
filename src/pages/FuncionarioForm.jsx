// src/pages/FuncionarioForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IMaskInput } from 'react-imask';
import { cpf } from 'cpf-cnpj-validator';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import {
  getFuncionarioById,
  createFuncionario,
  updateFuncionario,
  uploadAvatar,
  getAvatarPublicUrl,
  deleteFuncionario
} from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService'; 
import { getListaBancos } from '../services/bancoService'; 

import ModalConfirmacao from '../components/Modal/ModalConfirmacao';
import HistoricoMovimentacoes from '../components/HistoricoMovimentacoes';
import './FuncionarioForm.css';

// Schema de Validação Refinado
const funcionarioSchema = z.object({
  // Pessoal
  nome_completo: z.string().min(3, "Nome completo é obrigatório"),
  data_nascimento: z.string().nullish().or(z.literal('')),
  cpf: z.string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length === 0 || cpf.isValid(val), {
      message: "CPF inválido",
    }),
  rg: z.string().nullish().or(z.literal('')),
  genero: z.string().nullish().or(z.literal('')),
  estado_civil: z.string().nullish().or(z.literal('')),
  email_pessoal: z.string().email("E-mail inválido").or(z.literal("")).nullish(),
  telefone_celular: z.string().nullish().or(z.literal('')),
  
  // Endereço
  endereco_cep: z.string().nullish().or(z.literal('')),
  endereco_rua: z.string().nullish().or(z.literal('')),
  endereco_numero: z.string().nullish().or(z.literal('')),
  endereco_complemento: z.string().nullish().or(z.literal('')),
  endereco_bairro: z.string().nullish().or(z.literal('')),
  endereco_cidade: z.string().nullish().or(z.literal('')),
  endereco_estado: z.string().nullish().or(z.literal('')),
  
  // Contratual
  empresa_id: z.string().min(1, "Selecione a Empresa (Aba Contratual)"),
  id_matricula: z.string().nullish().or(z.literal('')),
  cargo: z.string().min(1, "Cargo é obrigatório"),
  departamento: z.string().nullish().or(z.literal('')),
  email_corporativo: z.string().email("E-mail inválido").min(1, "E-mail corporativo é obrigatório"),
  data_admissao: z.string().nullish().or(z.literal('')),
  tipo_contrato: z.string().optional(),
  
  // Correção para Salário: Trata undefined, null e string vazia
  salario_bruto: z.preprocess(
    (val) => {
      if (!val || String(val).trim() === '') return null;
      return parseFloat(String(val));
    },
    z.number().nullable()
  ),
  status: z.string().optional(),
  
  // Bancário
  banco_nome: z.string().nullish().or(z.literal('')),
  banco_agencia: z.string().nullish().or(z.literal('')),
  banco_conta_numero: z.string().nullish().or(z.literal('')),
  banco_tipo_conta: z.string().nullish().or(z.literal('')),
  
  // Avatar (pode ser null ou string vazia)
  avatar_url: z.string().nullish().or(z.literal('')),
});

function FuncionarioForm() {
  const [activeTab, setActiveTab] = useState('pessoal');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listaBancos, setListaBancos] = useState([]);

  const numeroInputRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const { mutate } = useSWRConfig();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset
  } = useForm({
    resolver: zodResolver(funcionarioSchema),
    // --- CORREÇÃO PRINCIPAL: Default Values Completos ---
    defaultValues: {
      nome_completo: '',
      data_nascimento: '',
      cpf: '',
      rg: '',
      genero: '',
      estado_civil: '',
      email_pessoal: '',
      telefone_celular: '',
      endereco_cep: '',
      endereco_rua: '',
      endereco_numero: '',
      endereco_complemento: '',
      endereco_bairro: '',
      endereco_cidade: '',
      endereco_estado: '',
      empresa_id: '',
      id_matricula: '',
      cargo: '',
      departamento: '',
      email_corporativo: '',
      data_admissao: '',
      tipo_contrato: 'CLT',
      salario_bruto: '',
      status: 'Ativo',
      banco_nome: '',
      banco_agencia: '',
      banco_conta_numero: '',
      banco_tipo_conta: 'Corrente',
      avatar_url: '',
    }
  });

  const { data: funcionarioData, isLoading: isFetching } = useSWR(
    isEditMode ? ['funcionario', id] : null, 
    () => getFuncionarioById(id)
  );

  const { data: listaEmpresas, isLoading: loadingEmpresas } = useSWR(
    'getEmpresas', 
    getEmpresas
  );

  useEffect(() => {
    getListaBancos().then(data => setListaBancos(data));
  }, []);

  useEffect(() => {
    if (funcionarioData) {
      const formattedData = {
        ...funcionarioData,
        data_nascimento: funcionarioData.data_nascimento ? funcionarioData.data_nascimento.split('T')[0] : '',
        data_admissao: funcionarioData.data_admissao ? funcionarioData.data_admissao.split('T')[0] : '',
        salario_bruto: funcionarioData.salario_bruto || '',
        empresa_id: funcionarioData.empresa_id || '', 
        // Garante que null vire string vazia para o formulário
        rg: funcionarioData.rg || '',
        genero: funcionarioData.genero || '',
        estado_civil: funcionarioData.estado_civil || '',
        email_pessoal: funcionarioData.email_pessoal || '',
        telefone_celular: funcionarioData.telefone_celular || '',
        endereco_cep: funcionarioData.endereco_cep || '',
        endereco_rua: funcionarioData.endereco_rua || '',
        endereco_numero: funcionarioData.endereco_numero || '',
        endereco_complemento: funcionarioData.endereco_complemento || '',
        endereco_bairro: funcionarioData.endereco_bairro || '',
        endereco_cidade: funcionarioData.endereco_cidade || '',
        endereco_estado: funcionarioData.endereco_estado || '',
        id_matricula: funcionarioData.id_matricula || '',
        departamento: funcionarioData.departamento || '',
        banco_nome: funcionarioData.banco_nome || '',
        banco_agencia: funcionarioData.banco_agencia || '',
        banco_conta_numero: funcionarioData.banco_conta_numero || '',
        banco_tipo_conta: funcionarioData.banco_tipo_conta || 'Corrente',
        avatar_url: funcionarioData.avatar_url || '',
      };
      reset(formattedData); 
      if (funcionarioData.avatar_url) {
        setAvatarPreview(getAvatarPublicUrl(funcionarioData.avatar_url));
      }
    }
  }, [funcionarioData, reset]);

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const onInvalid = (errors) => {
    console.error("Erros de validação:", errors);
    
    const errorKeys = Object.keys(errors);
    const contractualFields = ['empresa_id', 'cargo', 'email_corporativo', 'salario_bruto', 'tipo_contrato', 'status', 'id_matricula', 'departamento', 'data_admissao'];
    const bankingFields = ['banco_nome', 'banco_agencia', 'banco_conta_numero', 'banco_tipo_conta'];

    if (errorKeys.some(key => contractualFields.includes(key))) {
      setActiveTab('contratual');
      toast.error("Verifique os erros na aba 'Dados Contratuais'");
    } else if (errorKeys.some(key => bankingFields.includes(key))) {
      setActiveTab('bancario');
      toast.error("Verifique os erros na aba 'Dados Bancários'");
    } else {
      setActiveTab('pessoal');
      toast.error("Verifique os erros na aba 'Dados Pessoais'");
    }
  };

  const onSubmit = async (data) => {
    if (isLoading) return;
    setIsLoading(true);
    setPageError(null);

    try {
      let finalData = { ...data };
      
      // Limpeza de campos vazios para null antes de enviar ao banco
      Object.keys(finalData).forEach(key => {
        if (finalData[key] === '') finalData[key] = null;
      });

      // Upload do Avatar
      if (avatarFile) {
        const avatarPath = await uploadAvatar(avatarFile);
        finalData.avatar_url = avatarPath;
      }
      
      // Tratamento específico de datas
      if (finalData.data_nascimento === '') finalData.data_nascimento = null;
      if (finalData.data_admissao === '') finalData.data_admissao = null;

      if (isEditMode) {
        await updateFuncionario(id, finalData);
      } else {
        await createFuncionario(finalData);
      }
      
      mutate('getFuncionarios');
      if(isEditMode) mutate(['funcionario', id]);

      toast.success(isEditMode ? 'Atualizado com sucesso!' : 'Cadastrado com sucesso!');
      navigate('/funcionarios');

    } catch (err) {
      console.error("Erro no submit:", err);
      let errorMessage = "Erro ao salvar.";
      
      if (err.message?.includes('funcionarios_cpf_key')) errorMessage = "CPF já cadastrado.";
      else if (err.message?.includes('funcionarios_email_corporativo_key')) errorMessage = "Email Corporativo já em uso.";
      else if (err.message?.includes('funcionarios_id_matricula_key')) errorMessage = "Matrícula já em uso.";
      else if (err.message) errorMessage = err.message;

      setPageError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setValue('endereco_rua', data.logradouro);
        setValue('endereco_bairro', data.bairro);
        setValue('endereco_cidade', data.localidade);
        setValue('endereco_estado', data.uf);
        numeroInputRef.current?.focus();
      }
    } catch (error) { /* silêncio */ }
  };

  const handleConfirmDelete = async () => {
    if (!isEditMode) return;
    setIsLoading(true);
    try {
      await deleteFuncionario(id);
      mutate('getFuncionarios');
      toast.success('Excluído com sucesso!');
      navigate('/funcionarios');
    } catch (err) {
      toast.error("Erro ao excluir.");
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  const handleDeleteClick = () => setIsModalOpen(true);

  if (isFetching && isEditMode) return <p>Carregando...</p>;

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="form-header">
          <h2>{isEditMode ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
          <div className="form-actions-right">
            <button type="button" className="button-secondary" onClick={() => navigate('/funcionarios')}>
              Cancelar
            </button>
            <button type="submit" className="button-primary" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        <div className="avatar-section">
          <img src={avatarPreview || 'https://placehold.co/150'} alt="Avatar" className="avatar-preview" />
          <input type="file" id="avatar" onChange={handleAvatarChange} accept="image/*" />
          <label htmlFor="avatar" className="button-upload">Trocar Foto</label>
        </div>

        <div className="form-tabs">
          <button type="button" onClick={() => setActiveTab('pessoal')} className={activeTab === 'pessoal' ? 'active' : ''}>Dados Pessoais</button>
          <button type="button" onClick={() => setActiveTab('contratual')} className={activeTab === 'contratual' ? 'active' : ''}>Dados Contratuais</button>
          <button type="button" onClick={() => setActiveTab('bancario')} className={activeTab === 'bancario' ? 'active' : ''}>Dados Bancários</button>
          {isEditMode && (
            <button type="button" onClick={() => setActiveTab('historico')} className={activeTab === 'historico' ? 'active' : ''}>
              Histórico
            </button>
          )}
        </div>

        <div className="form-content">
          {activeTab === 'pessoal' && (
            <div className="form-grid">
              <div className="form-group span-3">
                <label>Nome Completo *</label>
                <input type="text" {...register("nome_completo")} />
                {errors.nome_completo && <span className="error-message">{errors.nome_completo.message}</span>}
              </div>
              
              <div className="form-group">
                <label>Data de Nascimento</label>
                <input type="date" {...register("data_nascimento")} />
              </div>

              <div className="form-group span-2">
                <label>Email Pessoal</label>
                <input type="email" {...register("email_pessoal")} />
                {errors.email_pessoal && <span className="error-message">{errors.email_pessoal.message}</span>}
              </div>

              <div className="form-group span-2">
                <label>Telefone Celular</label>
                <Controller
                  name="telefone_celular"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask="(00) 00000-0000"
                      name={field.name}
                      value={field.value || ''}
                      onAccept={(value) => field.onChange(value)}
                    />
                  )}
                />
              </div>

              <div className="form-group">
                <label>CPF</label>
                <Controller
                  name="cpf"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask="000.000.000-00"
                      name={field.name}
                      value={field.value || ''}
                      onAccept={(value) => field.onChange(value)}
                    />
                  )}
                />
                {errors.cpf && <span className="error-message">{errors.cpf.message}</span>}
              </div>
              
              <div className="form-group"><label>RG</label><input type="text" {...register("rg")} /></div>
              
              <div className="form-group">
                <label>Gênero</label>
                <select {...register("genero")}>
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Estado Civil</label>
                <select {...register("estado_civil")}>
                  <option value="">Selecione</option>
                  <option value="Solteiro">Solteiro(a)</option>
                  <option value="Casado">Casado(a)</option>
                  <option value="Divorciado">Divorciado(a)</option>
                </select>
              </div>

              <div className="form-group span-4"><hr /><h4>Endereço</h4></div>
              
              <div className="form-group">
                <label>CEP</label>
                <Controller
                  name="endereco_cep"
                  control={control}
                  render={({ field }) => (
                    <IMaskInput
                      mask="00000-000"
                      name={field.name}
                      value={field.value || ''}
                      onAccept={(value) => field.onChange(value)}
                      onBlur={handleCepBlur} 
                    />
                  )}
                />
              </div>

              <div className="form-group span-3"><label>Rua/Logradouro</label><input type="text" {...register("endereco_rua")} /></div>
              <div className="form-group"><label>Número</label><input type="text" {...register("endereco_numero")} ref={numeroInputRef} /></div>
              <div className="form-group"><label>Bairro</label><input type="text" {...register("endereco_bairro")} /></div>
              <div className="form-group"><label>Cidade</label><input type="text" {...register("endereco_cidade")} /></div>
              <div className="form-group"><label>Estado (UF)</label><input type="text" {...register("endereco_estado")} maxLength="2" /></div>
              <div className="form-group span-4"><label>Complemento</label><input type="text" {...register("endereco_complemento")} /></div>
            </div>
          )}
          {activeTab === 'contratual' && (
            <div className="form-grid">
              <div className="form-group span-2">
                <label>Vínculo Empresa *</label>
                <select 
                  {...register("empresa_id")} 
                  disabled={loadingEmpresas}
                  style={errors.empresa_id ? {borderColor: '#e53e3e'} : {}}
                >
                  <option value="">Selecione a empresa...</option>
                  {listaEmpresas?.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
                  ))}
                </select>
                {errors.empresa_id && <span className="error-message">{errors.empresa_id.message}</span>}
              </div>

              <div className="form-group span-2">
                <label>Email Corporativo *</label>
                <input type="email" {...register("email_corporativo")} />
                {errors.email_corporativo && <span className="error-message">{errors.email_corporativo.message}</span>}
              </div>
              
              <div className="form-group"><label>Matrícula</label><input type="text" {...register("id_matricula")} /></div>
              
              <div className="form-group">
                <label>Cargo *</label>
                <input type="text" {...register("cargo")} />
                {errors.cargo && <span className="error-message">{errors.cargo.message}</span>}
              </div>
              
              <div className="form-group"><label>Departamento</label><input type="text" {...register("departamento")} /></div>
              <div className="form-group"><label>Data de Admissão</label><input type="date" {...register("data_admissao")} /></div>
              
              <div className="form-group">
                <label>Tipo de Contrato</label>
                <select {...register("tipo_contrato")}>
                  <option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Estagio">Estágio</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Salário Bruto</label>
                <input type="number" step="0.01" {...register("salario_bruto")} />
              </div>
              
              <div className="form-group">
                <label>Status</label>
                <select {...register("status")}>
                  <option value="Ativo">Ativo</option><option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>
          )}
          {activeTab === 'bancario' && (
             <div className="form-grid">
              <div className="form-group">
                <label>Banco</label>
                <input list="bancos-list" placeholder="Busque..." {...register("banco_nome")} autoComplete="off" />
                <datalist id="bancos-list">
                  {listaBancos.map(banco => (
                    <option key={banco.code} value={`${banco.code} - ${banco.name}`} />
                  ))}
                </datalist>
              </div>
              <div className="form-group"><label>Agência</label><input type="text" {...register("banco_agencia")} /></div>
              <div className="form-group"><label>Conta</label><input type="text" {...register("banco_conta_numero")} /></div>
              <div className="form-group">
                <label>Tipo de Conta</label>
                <select {...register("banco_tipo_conta")}>
                  <option value="Corrente">Conta Corrente</option><option value="Poupanca">Conta Poupança</option>
                </select>
              </div>
            </div>
          )}
          
          {isEditMode && activeTab === 'historico' && (
            <HistoricoMovimentacoes funcionarioId={id} />
          )}
        </div>
        
        {pageError && <p className="error-message">{pageError}</p>}

        <div className="form-footer">
          {isEditMode && (
            <button type="button" className="button-delete" onClick={handleDeleteClick} disabled={isLoading}>
              Excluir Colaborador
            </button>
          )}
        </div>
      </form>
      
      <ModalConfirmacao
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
      >
        <p>Você tem certeza que deseja excluir este colaborador?</p>
      </ModalConfirmacao>
    </div>
  );
}

export default FuncionarioForm;