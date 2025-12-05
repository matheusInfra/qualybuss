import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IMaskInput } from 'react-imask';
import { cpf } from 'cpf-cnpj-validator';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';

// Services
import {
  getFuncionarioById,
  createFuncionario,
  updateFuncionario,
  deleteFuncionario
} from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService'; 
import { getBancos } from '../services/bancoService'; 

// Componentes Visuais e Funcionais
import ModalConfirmacao from '../components/Modal/ModalConfirmacao';
import HistoricoMovimentacoes from '../components/HistoricoMovimentacoes';
import TimelineAuditoria from '../components/Auditoria/TimelineAuditoria';
import AvatarUpload from '../components/Upload/AvatarUpload';

import './FuncionarioForm.css';

// Schema de Validação
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
  empresa_id: z.string().min(1, "Selecione a Empresa"),
  id_matricula: z.string().nullish().or(z.literal('')),
  cargo: z.string().min(1, "Cargo é obrigatório"),
  departamento: z.string().nullish().or(z.literal('')),
  email_corporativo: z.string().email("E-mail inválido").min(1, "E-mail corporativo é obrigatório"),
  data_admissao: z.string().nullish().or(z.literal('')),
  tipo_contrato: z.string().optional(),
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
  
  // Campos Virtuais
  inicio_periodo_migracao: z.string().optional(),
  saldo_inicial_migracao: z.string().optional(),
  observacoes: z.string().optional(),
});

function FuncionarioForm() {
  const [activeTab, setActiveTab] = useState('pessoal');
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [listaBancos, setListaBancos] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [modoMigracao, setModoMigracao] = useState(false);

  const numeroInputRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'novo');
  const { mutate } = useSWRConfig();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(funcionarioSchema),
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
      inicio_periodo_migracao: '',
      saldo_inicial_migracao: '',
      observacoes: ''
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
    getBancos().then(data => setListaBancos(data || []));
  }, []);

  useEffect(() => {
    if (funcionarioData) {
      const formattedData = {
        ...funcionarioData,
        data_nascimento: funcionarioData.data_nascimento ? funcionarioData.data_nascimento.split('T')[0] : '',
        data_admissao: funcionarioData.data_admissao ? funcionarioData.data_admissao.split('T')[0] : '',
        salario_bruto: funcionarioData.salario_bruto || '',
        empresa_id: funcionarioData.empresa_id || '',
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
        observacoes: funcionarioData.observacoes || ''
      };
      
      reset(formattedData); 
      
      if (funcionarioData.avatar_url) {
        setAvatarUrl(funcionarioData.avatar_url);
      }
    }
  }, [funcionarioData, reset]);

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
      let payload = { ...data };
      
      // Injeta Avatar URL
      payload.avatar_url = avatarUrl; 
      
      // Remove campos virtuais
      delete payload.inicio_periodo_migracao;
      delete payload.saldo_inicial_migracao;

      // Sincronia de email
      if (payload.email_corporativo && !payload.email) {
        payload.email = payload.email_corporativo;
      }

      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      let funcionarioId = id;

      if (isEditMode) {
        // [SEGURANÇA] Se estiver editando, remove o salário do payload para não sobrescrever
        // (Apenas se o backend não tiver trigger, mas é bom garantir no front também)
        delete payload.salario_bruto; 
        
        await updateFuncionario(id, payload);
        toast.success('Atualizado com sucesso!');
      } else {
        const novoFunc = await createFuncionario(payload);
        funcionarioId = novoFunc.id;
        toast.success('Cadastrado com sucesso!');

        if (modoMigracao) {
          if (data.inicio_periodo_migracao && data.saldo_inicial_migracao) {
             const inicio = new Date(data.inicio_periodo_migracao);
             const fim = new Date(inicio);
             fim.setFullYear(fim.getFullYear() + 1);
             
             await supabase.from('periodos_aquisitivos').insert([{
               funcionario_id: funcionarioId,
               inicio_periodo: data.inicio_periodo_migracao,
               fim_periodo: fim.toISOString().split('T')[0],
               dias_direito: 30,
               dias_gozados: 30 - Number(data.saldo_inicial_migracao),
               status: 'Aberto'
             }]);
          }
        } else {
          const admissao = new Date(data.data_admissao);
          const fimAquisitivo = new Date(admissao);
          fimAquisitivo.setFullYear(fimAquisitivo.getFullYear() + 1);

          await supabase.from('periodos_aquisitivos').insert([{
            funcionario_id: funcionarioId,
            inicio_periodo: data.data_admissao,
            fim_periodo: fimAquisitivo.toISOString().split('T')[0],
            dias_direito: 30,
            dias_gozados: 0,
            status: 'Em Aquisicao'
          }]);
        }
      }
      
      mutate('getFuncionarios');
      navigate('/funcionarios');

    } catch (err) {
      console.error("Erro no submit:", err);
      let errorMessage = "Erro ao salvar.";
      if (err.message?.includes('funcionarios_cpf_key')) errorMessage = "CPF já cadastrado.";
      else if (err.message?.includes('funcionarios_email_corporativo_key')) errorMessage = "Email Corporativo já em uso.";
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

  if (isFetching && isEditMode) return <div className="loading-state">Carregando dados...</div>;

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

        <div className="avatar-section-wrapper">
          <AvatarUpload 
            url={avatarUrl} 
            onUpload={(url) => setAvatarUrl(url)} 
          />
        </div>

        <div className="form-tabs">
          <button type="button" onClick={() => setActiveTab('pessoal')} className={activeTab === 'pessoal' ? 'active' : ''}>Dados Pessoais</button>
          <button type="button" onClick={() => setActiveTab('contratual')} className={activeTab === 'contratual' ? 'active' : ''}>Dados Contratuais</button>
          <button type="button" onClick={() => setActiveTab('bancario')} className={activeTab === 'bancario' ? 'active' : ''}>Dados Bancários</button>
          {isEditMode && (
            <button type="button" onClick={() => setActiveTab('historico')} className={activeTab === 'historico' ? 'active' : ''}>
              Histórico & Auditoria
            </button>
          )}
        </div>

        <div className="form-content">
          {/* ================= ABA PESSOAL ================= */}
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

              <div className="form-group span-4"><hr /><h4>Endereço Residencial</h4></div>
              
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
              <div className="form-group"><label>Estado (UF)</label><input type="text" {...register("endereco_estado")} maxLength="2" style={{textTransform:'uppercase'}} /></div>
              <div className="form-group span-4"><label>Complemento</label><input type="text" {...register("endereco_complemento")} /></div>
            </div>
          )}

          {/* ================= ABA CONTRATUAL ================= */}
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
                <label>Email Corporativo (Login) *</label>
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
              
              {/* --- SALÁRIO BLINDADO --- */}
              <div className="form-group">
                <label style={{display:'flex', alignItems:'center', gap:'5px'}}>
                  Salário Bruto 
                  {isEditMode && <span className="material-symbols-outlined icon-small" title="Campo Protegido">lock</span>}
                </label>
                
                <div style={{display:'flex', gap:'5px'}}>
                  <input 
                    type="number" 
                    step="0.01" 
                    {...register("salario_bruto")} 
                    disabled={isEditMode} // Bloqueado se for edição
                    style={isEditMode ? {backgroundColor: '#f3f4f6', cursor: 'not-allowed'} : {}}
                  />
                  {isEditMode && (
                    <button 
                      type="button" 
                      className="btn-icon-action" 
                      title="Gerenciar Salário e Reajustes"
                      onClick={() => navigate('/salarios')}
                      style={{
                        background: '#eff6ff', border: '1px solid #bfdbfe', color:'#2563eb', 
                        borderRadius:'6px', padding:'0 10px', cursor:'pointer'
                      }}
                    >
                      <span className="material-symbols-outlined">payments</span>
                    </button>
                  )}
                </div>
                {isEditMode && <small style={{color:'#64748b', fontSize:'0.8em'}}>Gerencie reajustes no módulo de Salários.</small>}
              </div>
              
              <div className="form-group">
                <label>Status</label>
                <select {...register("status")}>
                  <option value="Ativo">Ativo</option><option value="Inativo">Inativo</option>
                </select>
              </div>

              {/* --- LÓGICA DE FÉRIAS (APENAS NA CRIAÇÃO) --- */}
              {!isEditMode && (
                <div className="form-group span-4 ferias-setup-box">
                  <h4>Configuração Inicial de Férias</h4>
                  <div className="switch-wrapper">
                    <label className="switch-label">
                      <input 
                        type="checkbox" 
                        checked={modoMigracao} 
                        onChange={(e) => setModoMigracao(e.target.checked)} 
                      />
                      <span className="slider"></span>
                      <span className="label-text">
                        {modoMigracao ? "Modo Migração (Colaborador Antigo)" : "Novo Colaborador (Início Imediato)"}
                      </span>
                    </label>
                  </div>

                  {!modoMigracao ? (
                    <p className="info-text">
                      <span className="material-symbols-outlined icon-small">lock_clock</span>
                      O sistema criará o período aquisitivo iniciando na data de admissão.
                      O saldo ficará <strong>bloqueado (Em Aquisição)</strong> até completar 1 ano.
                    </p>
                  ) : (
                    <div className="migracao-inputs">
                      <div className="form-group">
                        <label>Início do Período VIGENTE</label>
                        <input type="date" {...register('inicio_periodo_migracao')} />
                        <small>Último aniversário de admissão</small>
                      </div>
                      <div className="form-group">
                        <label>Saldo Disponível (Dias)</label>
                        <input type="number" {...register('saldo_inicial_migracao')} placeholder="Ex: 30" />
                        <small>Dias para tirar agora</small>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= ABA BANCÁRIO ================= */}
          {activeTab === 'bancario' && (
             <div className="form-grid">
              <div className="form-group">
                <label>Banco</label>
                <select {...register("banco_nome")}>
                  <option value="">Selecione...</option>
                  {listaBancos.map(banco => (
                    <option key={banco.code} value={`${banco.code} - ${banco.name}`}>
                      {banco.code} - {banco.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label>Agência</label><input type="text" {...register("banco_agencia")} /></div>
              <div className="form-group"><label>Conta</label><input type="text" {...register("banco_conta_numero")} /></div>
              <div className="form-group">
                <label>Tipo de Conta</label>
                <select {...register("banco_tipo_conta")}>
                  <option value="Corrente">Conta Corrente</option><option value="Poupanca">Conta Poupança</option>
                  <option value="Salario">Conta Salário</option>
                </select>
              </div>
            </div>
          )}
          
          {/* ================= ABA HISTÓRICO ================= */}
          {isEditMode && activeTab === 'historico' && (
            <div className="historico-container">
              <h3>Histórico Funcional</h3>
              <HistoricoMovimentacoes funcionarioId={id} />
              
              <div className="divider-full"></div>
              
              <h3>Trilha de Auditoria</h3>
              <TimelineAuditoria registroId={id} />
            </div>
          )}
        </div>
        
        {pageError && <p className="error-message-box">{pageError}</p>}

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
        <p>Você tem certeza que deseja excluir este colaborador? Esta ação é irreversível.</p>
      </ModalConfirmacao>
    </div>
  );
}

export default FuncionarioForm;