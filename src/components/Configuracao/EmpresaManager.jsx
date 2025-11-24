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
  const [buscandoCep, setBuscandoCep] = useState(false);

  const { control, register, handleSubmit, reset, setValue, setFocus } = useForm();

  const handleNew = () => {
    setEditingEmpresa(null);
    reset({});
    setView('form');
  };

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa);
    // Ajusta campos que podem vir nulos ou com nomes diferentes se necessário
    reset(empresa);
    setView('form');
  };

  // --- BUSCA DE CEP ---
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
      // Foca no número após preencher
      setTimeout(() => document.getElementById('campo-numero')?.focus(), 100);
      
    } catch (error) {
      toast.error('Erro ao buscar CEP.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleSave = async (data) => {
    // Loading toast
    const toastId = toast.loading('Salvando dados empresariais...');

    try {
      // Tratamento de dados (conversão de datas vazias para null, etc)
      const payload = {
        ...data,
        data_fundacao: data.data_fundacao || null,
      };

      if (editingEmpresa) {
        await updateEmpresa(editingEmpresa.id, payload);
        toast.success('Cadastro empresarial atualizado!', { id: toastId });
      } else {
        const novaEmpresa = await createEmpresa(payload);
        
        // Vínculo Automático
        if (novaEmpresa && user) {
           const { error: vinculoError } = await supabase
             .from('usuarios_empresas')
             .insert([{
               user_id: user.id,
               empresa_id: novaEmpresa.id,
               role: 'admin',
               nome_exibicao: user.user_metadata?.nome_completo || 'Admin',
               email_exibicao: user.email
             }]);
             
           if (vinculoError) console.warn('Erro no vínculo automático:', vinculoError);
        }
        toast.success('Empresa cadastrada com sucesso!', { id: toastId });
      }
      mutate('getEmpresas');
      setView('list');
    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message, { id: toastId });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await deleteEmpresa(deleteModal.id);
      mutate('getEmpresas');
      toast.success('Empresa removida e dados desvinculados.');
      setDeleteModal(null);
    } catch (error) {
      toast.error('Erro ao excluir: ' + error.message);
    }
  };

  // --- VIEW: LISTA ---
  if (view === 'list') {
    return (
      <div className="config-module-container">
        <div className="config-header">
          <div className="header-left">
            <button onClick={onBack} className="btn-back">&larr;</button>
            <div>
              <h2>Gestão Corporativa</h2>
              <p>Gerencie as unidades de negócio e dados fiscais.</p>
            </div>
          </div>
          <button className="btn-primary" onClick={handleNew}>+ Nova Empresa</button>
        </div>

        <div className="cards-grid">
          {isLoading ? <p>Carregando...</p> : empresas?.map(emp => (
            <div key={emp.id} className="info-card">
              <div className="card-header-row">
                <div className="card-icon-box" style={{background: '#e6f7ff', color: '#1890ff'}}>
                  {emp.nome_fantasia ? emp.nome_fantasia.substring(0, 2).toUpperCase() : 'EP'}
                </div>
                <div className="card-header-text">
                  <h3>{emp.nome_fantasia}</h3>
                  <span className="card-subtext" style={{fontSize:'0.8rem'}}>{emp.razao_social || emp.nome_fantasia}</span>
                  <div className="card-subtext">{emp.cnpj || 'CNPJ não informado'}</div>
                </div>
              </div>
              
              <div className="card-body-rows">
                <div className="info-row">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>{emp.cidade ? `${emp.cidade}/${emp.estado}` : 'Endereço pendente'}</span>
                </div>
                <div className="info-row">
                  <span className="material-symbols-outlined">verified</span>
                  <span>{emp.regime_tributario || 'Regime não informado'}</span>
                </div>
              </div>

              <div className="card-footer-actions">
                <button onClick={() => handleEdit(emp)}>Gerenciar Dados</button>
                <button onClick={() => setDeleteModal(emp)} style={{color: '#e53e3e'}}>Baixar/Excluir</button>
              </div>
            </div>
          ))}

          {!isLoading && empresas?.length === 0 && (
            <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#666', border: '1px dashed #ccc', borderRadius: '8px'}}>
              Nenhuma empresa cadastrada. Comece adicionando sua Matriz.
            </div>
          )}
        </div>

        <ModalConfirmacao 
          isOpen={!!deleteModal} 
          onClose={() => setDeleteModal(null)}
          onConfirm={handleDelete}
          title="Excluir Registro Empresarial"
        >
          Tem certeza? Esta ação é irreversível e afetará todos os colaboradores vinculados a este CNPJ.
        </ModalConfirmacao>
      </div>
    );
  }

  // --- VIEW: FORMULÁRIO ERP ---
  return (
    <div className="config-module-container">
      <div className="config-header">
        <h2>{editingEmpresa ? 'Editar Dados Corporativos' : 'Novo Cadastro Empresarial'}</h2>
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="config-form">
        
        {/* Seção 1: Identificação */}
        <h4 className="form-section-title">Identificação da Empresa</h4>
        <div className="form-grid">
          <div className="form-group span-2">
            <label>Razão Social (Obrigatório)</label>
            <input {...register('razao_social')} placeholder="Razão Social Ltda." />
            <small style={{color: '#718096', fontSize: '0.8rem'}}>Nome oficial registrado no contrato social.</small>
          </div>

          <div className="form-group span-2">
            <label>Nome Fantasia *</label>
            <input {...register('nome_fantasia', { required: true })} placeholder="Ex: QualyBuss Matriz" />
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
            <label>Data de Fundação</label>
            <input type="date" {...register('data_fundacao')} />
          </div>
        </div>

        {/* Seção 2: Dados Fiscais */}
        <h4 className="form-section-title" style={{marginTop: '32px'}}>Dados Fiscais & Contato</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Inscrição Estadual</label>
            <input {...register('inscricao_estadual')} placeholder="Isento ou número" />
          </div>
          
          <div className="form-group">
            <label>Inscrição Municipal</label>
            <input {...register('inscricao_municipal')} />
          </div>

          <div className="form-group">
            <label>Regime Tributário</label>
            <select {...register('regime_tributario')}>
              <option value="">Selecione...</option>
              <option value="Simples Nacional">Simples Nacional</option>
              <option value="Lucro Presumido">Lucro Presumido</option>
              <option value="Lucro Real">Lucro Real</option>
              <option value="MEI">MEI</option>
            </select>
          </div>

          <div className="form-group">
            <label>Site / Web</label>
            <input {...register('site')} placeholder="www.suaempresa.com.br" />
          </div>
          
          <div className="form-group">
            <label>Email Corporativo</label>
            <input {...register('email_contato')} type="email" />
          </div>

          <div className="form-group">
            <label>Telefone Comercial</label>
            <Controller
              name="telefone"
              control={control}
              render={({ field }) => (
                <IMaskInput mask="(00) 0000-0000" {...field} className="imask-input" />
              )}
            />
          </div>
        </div>

        {/* Seção 3: Endereço (ViaCEP) */}
        <h4 className="form-section-title" style={{marginTop: '32px'}}>Endereço e Localização</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>CEP (Busca Automática)</label>
            <div style={{position: 'relative'}}>
              <Controller
                name="cep"
                control={control}
                render={({ field }) => (
                  <IMaskInput 
                    mask="00000-000" 
                    {...field} 
                    onBlur={(e) => {
                      field.onBlur(e);
                      handleCepBlur(e);
                    }}
                    placeholder="00000-000" 
                    className="imask-input" 
                  />
                )}
              />
              {buscandoCep && <span style={{position:'absolute', right:'10px', top:'12px', fontSize:'0.8rem', color:'#135bec'}}>Buscando...</span>}
            </div>
          </div>
          
          <div className="form-group span-2">
            <label>Logradouro</label>
            <input {...register('logradouro')} placeholder="Rua, Av..." />
          </div>

          <div className="form-group">
            <label>Número</label>
            <input id="campo-numero" {...register('numero')} placeholder="123" />
          </div>

          <div className="form-group">
            <label>Complemento</label>
            <input {...register('complemento')} placeholder="Sala, Bloco" />
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
            <label>Estado (UF)</label>
            <input {...register('estado')} maxLength={2} style={{textTransform: 'uppercase'}} />
          </div>
        </div>

        {/* Seção 4: Responsável Legal */}
        <h4 className="form-section-title" style={{marginTop: '32px'}}>Responsável Legal</h4>
        <div className="form-grid">
          <div className="form-group span-2">
            <label>Nome do Responsável</label>
            <input {...register('nome_responsavel')} />
          </div>
          <div className="form-group">
            <label>Email do Responsável</label>
            <input {...register('email_responsavel')} type="email" />
          </div>
          <div className="form-group">
            <label>Celular / WhatsApp</label>
            <Controller
              name="telefone_responsavel"
              control={control}
              render={({ field }) => (
                <IMaskInput mask="(00) 00000-0000" {...field} className="imask-input" />
              )}
            />
          </div>
        </div>

        <div className="form-footer-actions">
          <button type="button" className="btn-secondary" onClick={() => setView('list')}>Cancelar</button>
          <button type="submit" className="btn-primary">Salvar Cadastro</button>
        </div>
      </form>
    </div>
  );
}

export default EmpresaManager;