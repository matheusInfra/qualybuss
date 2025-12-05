// src/services/importacaoService.js

/**
 * Definição das colunas esperadas no CSV.
 * Usamos os nomes exatos do banco de dados para facilitar a importação.
 */
export const MODELO_CSV = {
  headers: [
    'nome_completo',
    'cpf',
    'rg',
    'data_nascimento',     // YYYY-MM-DD
    'email_corporativo',
    'telefone_celular',
    'cargo',
    'departamento',
    'data_admissao',       // YYYY-MM-DD
    'salario_bruto',
    'endereco_cep',
    'endereco_rua',
    'endereco_numero',
    'endereco_bairro',
    'endereco_cidade',
    'endereco_estado'      // UF (SP, RJ...)
  ],
  // Campos que NÃO podem faltar de jeito nenhum
  required: [
    'nome_completo',
    'cpf',
    'data_nascimento',
    'cargo',
    'data_admissao',
    'salario_bruto'
  ]
};

/**
 * Gera e baixa o arquivo modelo para o usuário preencher.
 * Inclui uma linha de exemplo para orientar o formato (datas, valores).
 */
export const downloadModeloCSV = () => {
  const headerString = MODELO_CSV.headers.join(',');
  
  // Linha de exemplo para ajudar o usuário a não errar formatos
  const exampleString = 'João da Silva,12345678900,123456789,1990-01-01,joao@qualybuss.com,11999999999,Analista,TI,2024-01-15,3500.00,01001000,Praça da Sé,10,Centro,São Paulo,SP';
  
  // \uFEFF é o BOM (Byte Order Mark) para o Excel abrir com acentos corretos
  const csvContent = `\uFEFF${headerString}\n${exampleString}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'modelo_importacao_funcionarios.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Lê o arquivo CSV, converte para JSON e valida regras básicas.
 * Retorna { data, errors }.
 */
export const parseAndValidateCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) {
        return reject(new Error("O arquivo está vazio ou contém apenas o cabeçalho."));
      }

      // Detecta separador (Excel as vezes usa ponto-e-vírgula em PT-BR)
      const firstLine = lines[0];
      const separator = firstLine.includes(';') ? ';' : ',';
      
      // Limpa aspas e espaços dos headers
      const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());
      
      // Valida se o usuário não mudou o nome das colunas obrigatórias
      const missingHeaders = MODELO_CSV.required.filter(req => !headers.includes(req));
      if (missingHeaders.length > 0) {
        return reject(new Error(`O arquivo está fora do padrão! Faltam as colunas: ${missingHeaders.join(', ')}`));
      }

      const result = [];
      const errors = [];

      // Começa da linha 1 (pula cabeçalho)
      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(separator);
        
        // Ignora linhas totalmente vazias
        if (currentLine.length < 2) continue;

        const obj = {};
        let rowError = null;

        // Mapeia colunas
        headers.forEach((header, index) => {
          let value = currentLine[index]?.trim().replace(/"/g, '');
          if (value) obj[header] = value;
        });

        // Validação 1: Campos Obrigatórios
        const missingFields = MODELO_CSV.required.filter(field => !obj[field]);
        if (missingFields.length > 0) {
          rowError = `Linha ${i + 1}: Faltando ${missingFields.join(', ')}`;
        }

        // Validação 2: Formato de Salário
        if (obj.salario_bruto && isNaN(parseFloat(obj.salario_bruto))) {
          rowError = `Linha ${i + 1}: Salário inválido (${obj.salario_bruto})`;
        }

        // Validação 3: Formato de Data (Básico)
        if (obj.data_admissao && !obj.data_admissao.includes('-')) {
           // Se não tiver traço, pode estar errado (ex: 01/01/2024), avisamos mas não bloqueamos
           // console.warn("Data possivelmente fora do padrão ISO YYYY-MM-DD");
        }

        if (rowError) {
          errors.push(rowError);
        } else {
          result.push(obj);
        }
      }

      resolve({ data: result, errors });
    };
    
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsText(file);
  });
};

/**
 * Utilitário para baixar JSON (usado na configuração da IA)
 */
export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};