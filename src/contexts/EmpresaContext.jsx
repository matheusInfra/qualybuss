import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const EmpresaContext = createContext();

export function EmpresaProvider({ children }) {
  const { user } = useAuth();
  const [empresaAtual, setEmpresaAtual] = useState(null);
  const [minhasEmpresas, setMinhasEmpresas] = useState([]);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);

  // Carrega as empresas que o usuário tem permissão ao logar
  useEffect(() => {
    if (user) {
      carregarEmpresas();
    } else {
      setEmpresaAtual(null);
      setMinhasEmpresas([]);
      setLoadingEmpresa(false);
    }
  }, [user]);

  const carregarEmpresas = async () => {
    try {
      // Busca na tabela de vínculo + dados da empresa
      const { data, error } = await supabase
        .from('usuarios_empresas')
        .select('role, empresas (id, nome_fantasia, cnpj)')
        .eq('user_id', user.id);

      if (error) throw error;

      const listaFormatada = data.map(item => ({
        ...item.empresas,
        permissao: item.role
      }));

      setMinhasEmpresas(listaFormatada);

      // SELEÇÃO AUTOMÁTICA INTELIGENTE:
      // Se o usuário só tem 1 loja, entra nela direto.
      // Se tem mais de uma, deixa 'empresaAtual' null para forçar a tela de seleção.
      if (listaFormatada.length === 1) {
        setEmpresaAtual(listaFormatada[0]);
      } else {
        // Tenta recuperar a última usada do LocalStorage para conveniência
        const lastUsedId = localStorage.getItem('@QualyBuss:LastEmpresa');
        const found = listaFormatada.find(e => e.id === lastUsedId);
        if (found) setEmpresaAtual(found);
      }
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
    } finally {
      setLoadingEmpresa(false);
    }
  };

  const selecionarEmpresa = (empresa) => {
    setEmpresaAtual(empresa);
    localStorage.setItem('@QualyBuss:LastEmpresa', empresa.id);
  };

  return (
    <EmpresaContext.Provider value={{ 
      empresaAtual, 
      minhasEmpresas, 
      selecionarEmpresa, 
      loadingEmpresa 
    }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export const useEmpresa = () => useContext(EmpresaContext);