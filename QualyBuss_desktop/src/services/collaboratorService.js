import { supabase } from './supabase';

export const collaboratorService = {
    // Buscar todos os colaboradores
    async getAll() {
        // Tenta buscar do Supabase
        const { data, error } = await supabase
            .from('collaborators')
            .select('*')
            .order('full_name');

        if (error) {
            console.error('Erro ao buscar colaboradores:', error);
            // Fallback para dados locais se a tabela não existir ainda (para teste de UI)
            return getMockData();
        }

        return data && data.length > 0 ? data : getMockData();
    },

    // Buscar por ID
    async getById(id) {
        const { data, error } = await supabase
            .from('collaborators')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    // Criar novo
    async create(collaborator) {
        const { data, error } = await supabase
            .from('collaborators')
            .insert([formatPayload(collaborator)])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Atualizar
    async update(id, collaborator) {
        const { data, error } = await supabase
            .from('collaborators')
            .update(formatPayload(collaborator))
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Alternar Status (Inativar/Ativar)
    async toggleStatus(id, currentStatus) {
        const { data, error } = await supabase
            .from('collaborators')
            .update({ active: !currentStatus })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// Helper para formatar dados do formulário para o banco
const formatPayload = (data) => {
    // Ajuste conforme necessário para mapear campos do form para colunas do DB
    return {
        ...data,
        // Garante que campos vazios virem null para não quebrar constraints se houver
        cpf: data.cpf || null,
        admission_date: data.admission_date || null,
        birth_date: data.birth_date || null
    };
};

// Mock Data para desenvolvimento da UI antes do SQL rodar
const getMockData = () => [
    {
        id: '1',
        full_name: 'Ana Silva',
        role: 'Gerente de RH',
        department: 'Recursos Humanos',
        active: true,
        avatar_url: 'https://ui-avatars.com/api/?name=Ana+Silva&background=0D8ABC&color=fff',
        personal_email: 'ana.silva@email.com',
        phone: '(11) 99999-9999',
        contract_type: 'CLT',
        admission_date: '2023-01-15'
    },
    {
        id: '2',
        full_name: 'Carlos Souza',
        role: 'Desenvolvedor Senior',
        department: 'TI',
        active: true,
        avatar_url: 'https://ui-avatars.com/api/?name=Carlos+Souza&background=10B981&color=fff',
        personal_email: 'carlos.souza@email.com',
        phone: '(11) 98888-8888',
        contract_type: 'PJ',
        admission_date: '2023-03-10'
    },
    {
        id: '3',
        full_name: 'Mariana Costa',
        role: 'Analista Financeiro',
        department: 'Financeiro',
        active: false,
        avatar_url: 'https://ui-avatars.com/api/?name=Mariana+Costa&background=6366f1&color=fff',
        personal_email: 'mariana.costa@email.com',
        phone: '(11) 97777-7777',
        contract_type: 'CLT',
        admission_date: '2022-11-05'
    }
];
