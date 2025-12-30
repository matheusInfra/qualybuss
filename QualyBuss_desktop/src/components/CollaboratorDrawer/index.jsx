import React, { useState, useEffect } from 'react';

const CollaboratorDrawer = ({ isOpen, onClose, onSave, collaborator, isSaving }) => {
    const [activeTab, setActiveTab] = useState('pessoal');
    const [formData, setFormData] = useState({});

    // Reset form or load data when drawer opens
    useEffect(() => {
        if (isOpen) {
            if (collaborator) {
                setFormData(collaborator);
            } else {
                // Default Clean State
                setFormData({
                    active: true,
                    full_name: '', cpf: '', rg: '', birth_date: '', gender: '', marital_status: '',
                    address_street: '', address_number: '', address_city: '', address_state: '', address_zip_code: '',
                    role: '', cbo: '', department: '', admission_date: '', corporate_email: '', pis: '',
                    contract_type: 'CLT', work_regime: 'Presencial', salary: ''
                });
            }
            setActiveTab('pessoal');
        }
    }, [isOpen, collaborator]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div className="pointer-events-auto w-screen max-w-2xl transform transition ease-in-out duration-500 sm:duration-700 bg-white shadow-2xl flex flex-col h-full animate-slide-in-right">

                    {/* Header */}
                    <div className="px-6 py-6 bg-slate-900 border-b border-slate-700 text-white flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">
                                {collaborator ? 'Editar Colaborador' : 'Novo Colaborador'}
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                {collaborator ? 'Atualize as informações do cadastro' : 'Preencha os dados obrigatórios para cadastro'}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <span className="sr-only">Fechar</span>
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Form Content */}
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">

                        {/* Tabs Navigation */}
                        <div className="border-b border-slate-200 px-6">
                            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                                {['pessoal', 'profissional', 'contratual', 'historico'].map((tab) => (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => setActiveTab(tab)}
                                        className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                      ${activeTab === tab
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                    `}
                                    >
                                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

                            {/* Tab: Pessoal */}
                            {activeTab === 'pessoal' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="label">Nome Completo</label>
                                            <input name="full_name" value={formData.full_name || ''} onChange={handleChange} className="input" required />
                                        </div>

                                        <div>
                                            <label className="label">CPF</label>
                                            <input name="cpf" value={formData.cpf || ''} onChange={handleChange} className="input" placeholder="000.000.000-00" />
                                        </div>
                                        <div>
                                            <label className="label">RG</label>
                                            <input name="rg" value={formData.rg || ''} onChange={handleChange} className="input" />
                                        </div>

                                        <div>
                                            <label className="label">Data de Nascimento</label>
                                            <input type="date" name="birth_date" value={formData.birth_date || ''} onChange={handleChange} className="input" />
                                        </div>
                                        <div>
                                            <label className="label">Gênero</label>
                                            <select name="gender" value={formData.gender || ''} onChange={handleChange} className="input">
                                                <option value="">Selecione</option>
                                                <option value="Masculino">Masculino</option>
                                                <option value="Feminino">Feminino</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2 border-t pt-4 mt-2">
                                            <h3 className="font-semibold text-slate-800 mb-4">Endereço</h3>
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="label">Rua</label>
                                            <input name="address_street" value={formData.address_street || ''} onChange={handleChange} className="input" />
                                        </div>
                                        <div>
                                            <label className="label">CEP</label>
                                            <input name="address_zip_code" value={formData.address_zip_code || ''} onChange={handleChange} className="input" />
                                        </div>
                                        <div>
                                            <label className="label">Cidade</label>
                                            <input name="address_city" value={formData.address_city || ''} onChange={handleChange} className="input" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Profissional */}
                            {activeTab === 'profissional' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="label">Cargo</label>
                                            <input name="role" value={formData.role || ''} onChange={handleChange} className="input" required />
                                        </div>

                                        <div>
                                            <label className="label">Departamento</label>
                                            <input name="department" value={formData.department || ''} onChange={handleChange} className="input" />
                                        </div>
                                        <div>
                                            <label className="label">CBO (Código Bras. Ocupação)</label>
                                            <input name="cbo" value={formData.cbo || ''} onChange={handleChange} className="input" placeholder="1234-56" />
                                        </div>

                                        <div>
                                            <label className="label">PIS</label>
                                            <input name="pis" value={formData.pis || ''} onChange={handleChange} className="input" />
                                        </div>
                                        <div>
                                            <label className="label">Data Admissão</label>
                                            <input type="date" name="admission_date" value={formData.admission_date || ''} onChange={handleChange} className="input" />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="label">Email Corporativo</label>
                                            <input type="email" name="corporate_email" value={formData.corporate_email || ''} onChange={handleChange} className="input" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Contratual */}
                            {activeTab === 'contratual' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="label">Tipo de Contrato</label>
                                            <select name="contract_type" value={formData.contract_type || ''} onChange={handleChange} className="input">
                                                <option value="CLT">CLT</option>
                                                <option value="PJ">PJ</option>
                                                <option value="Estágio">Estágio</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Regime de Trabalho</label>
                                            <select name="work_regime" value={formData.work_regime || ''} onChange={handleChange} className="input">
                                                <option value="Presencial">Presencial</option>
                                                <option value="Híbrido">Híbrido</option>
                                                <option value="Remoto">Remoto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label">Salário Base</label>
                                            <input type="number" name="salary" value={formData.salary || ''} onChange={handleChange} className="input" />
                                        </div>
                                        <div>
                                            <label className="label">Status Atual</label>
                                            <select name="active" value={formData.active ? 'true' : 'false'} onChange={(e) => handleChange({ target: { name: 'active', value: e.target.value === 'true' } })} className="input border-slate-300">
                                                <option value="true">Ativo</option>
                                                <option value="false">Inativo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab: Histórico */}
                            {activeTab === 'historico' && (
                                <div className="space-y-4 animate-fade-in">
                                    <p className="text-slate-500 italic text-center py-8">Histórico de movimentações será exibido aqui. (Somente Leitura neste MVP)</p>
                                </div>
                            )}

                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-70 flex items-center gap-2"
                            >
                                {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                Salvar Colaborador
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
        .label { @apply block text-sm font-medium text-slate-700 mb-1; }
        .input { @apply w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all; }
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out forwards; }
      `}</style>
        </div>
    );
};

export default CollaboratorDrawer;
