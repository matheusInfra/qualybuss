// src/services/importacaoService.js

export const MODELO_CSV = {
  headers: [
    'nome_completo', 'cpf', 'rg', 'data_nascimento', 'email_corporativo',
    'telefone_celular', 'cargo', 'departamento', 'data_admissao',
    'salario_bruto', 'endereco_cep', 'endereco_rua', 'endereco_numero',
    'endereco_bairro', 'endereco_cidade', 'endereco_estado'
  ],
  required: ['nome_completo', 'cpf', 'data_nascimento', 'cargo', 'data_admissao', 'salario_bruto']
};

export const downloadModeloCSV = () => {
  const headerString = MODELO_CSV.headers.join(',');
  const exampleString = 'João da Silva,12345678900,123456789,1990-01-01,joao@qualybuss.com,11999999999,Analista,TI,2024-01-15,3500.00,01001000,Praça da Sé,10,Centro,São Paulo,SP';
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

export const parseAndValidateCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length < 2) return reject(new Error("Arquivo vazio ou sem cabeçalho."));

      const separator = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, '').toLowerCase());
      
      // Valida cabeçalhos obrigatórios
      const missingHeaders = MODELO_CSV.required.filter(req => !headers.includes(req));
      if (missingHeaders.length > 0) return reject(new Error(`Faltam colunas obrigatórias: ${missingHeaders.join(', ')}`));

      const result = [];
      const errors = [];
      const cpfsVistos = new Set();

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(separator);
        if (currentLine.length < 2) continue; // Pula linhas vazias

        const obj = {};
        let rowError = null;

        headers.forEach((header, index) => {
          let value = currentLine[index]?.trim().replace(/"/g, '');
          if (value) obj[header] = value;
        });

        // Validação de campos obrigatórios na linha
        const missingFields = MODELO_CSV.required.filter(field => !obj[field]);
        if (missingFields.length > 0) rowError = `Linha ${i + 1}: Faltam dados (${missingFields.join(', ')})`;
        
        // Validação de Salário
        if (obj.salario_bruto && isNaN(parseFloat(obj.salario_bruto))) {
            rowError = `Linha ${i + 1}: Salário inválido`;
        }

        // Validação de Duplicidade de CPF no arquivo
        if (obj.cpf) {
          const cpfLimpo = obj.cpf.replace(/\D/g, '');
          if (cpfsVistos.has(cpfLimpo)) {
            rowError = `Linha ${i + 1}: CPF duplicado no arquivo`;
          } else {
            cpfsVistos.add(cpfLimpo);
            obj.cpf = cpfLimpo;
          }
        }

        if (rowError) errors.push(rowError);
        else result.push(obj);
      }
      resolve({ data: result, errors });
    };
    reader.onerror = () => reject(new Error("Erro de leitura do arquivo."));
    reader.readAsText(file);
  });
};

/**
 * Função utilitária para baixar dados em formato JSON
 * Utilizada para backups de configurações da IA
 */
export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};