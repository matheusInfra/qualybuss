import React, { useState, useEffect } from 'react';
import CollaboratorCard from '../../components/CollaboratorCard';
import CollaboratorDrawer from '../../components/CollaboratorDrawer';
import { collaboratorService } from '../../services/collaboratorService';

const Colaboradores = () => {
    const [collaborators, setCollaborators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedCollab, setSelectedCollab] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Carregar dados
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await collaboratorService.getAll();
            setCollaborators(data);
        } catch (error) {
            console.error("Failed to fetch collaborators", error);
        } finally {
            setLoading(false);
        }
    };

    // Handlers
    const handleCreateNew = () => {
        setSelectedCollab(null); // Modo Criação
        setIsDrawerOpen(true);
    };

    const handleEdit = (collab) => {
        setSelectedCollab(collab); // Modo Edição
        setIsDrawerOpen(true);
    };

    const handleSave = async (formData) => {
        setIsSaving(true);
        try {
            if (selectedCollab) {
                // Update
                await collaboratorService.update(selectedCollab.id, formData);
            } else {
                // Create
                await collaboratorService.create(formData);
            }
            setIsDrawerOpen(false);
            fetchData(); // Recarrega a lista
        } catch (error) {
            console.error("Error saving collaborator", error);
            alert("Erro ao salvar. Verifique o console.");
        } finally {
            setIsSaving(false);
        }
    };

    // Filtro Local
    const filteredCollaborators = collaborators.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header da Página */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4 animate-fade-in-down">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Quadro de Colaboradores
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gerencie sua equipe, contratos e movimentações em um só lugar.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar colaborador..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={handleCreateNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Novo
                    </button>
                </div>
            </div>

            {/* Grid Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white h-64 rounded-2xl animate-pulse shadow-sm"></div>
                    ))}
                </div>
            ) : (
                <>
                    {filteredCollaborators.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Nenhum colaborador encontrado</h3>
                            <p className="text-slate-500">Tente ajustar sua busca ou adicione um novo.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                            {filteredCollaborators.map(collab => (
                                <CollaboratorCard
                                    key={collab.id}
                                    data={collab}
                                    onClick={handleEdit}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Drawer Form */}
            <CollaboratorDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                collaborator={selectedCollab}
                onSave={handleSave}
                isSaving={isSaving}
            />

        </div>
    );
};

export default Colaboradores;
