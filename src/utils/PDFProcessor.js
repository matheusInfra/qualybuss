import * as pdfjsLib from 'pdfjs-dist';

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Concatena os itens de texto com um espaço, mas preserva quebras de linha implícitas
    // para evitar que "CBO" e o número fiquem colados de forma estranha
    const pageText = textContent.items.map((item) => item.str).join(' ');
    
    // Normalização básica para facilitar a busca (remove espaços extras)
    const normalizedText = pageText.replace(/\s+/g, ' ').trim();

    pages.push({
      pageNumber: i,
      text: normalizedText,
      originalText: pageText // Mantém original para regex mais complexos se precisar
    });
  }

  return pages;
};

/**
 * Função auxiliar para verificar se um CBO está presente no texto
 * Aceita formatos: 1234-56 ou 123456
 */
export const checkCBOInText = (text, cboFuncionario) => {
  if (!cboFuncionario) return true; // Se funcionário não tem CBO cadastrado, ignoramos essa validação (passa)

  // Remove formatação do CBO do funcionário (deixa apenas números)
  const cboLimpo = cboFuncionario.replace(/\D/g, ''); 
  
  if (cboLimpo.length < 4) return true; // CBO muito curto/inválido ignoramos a validação

  // Remove tudo que não é dígito do texto do PDF para buscar a sequência exata
  // OU busca a sequência no texto normal (mais seguro para evitar falsos positivos com datas)
  // Estratégia: Buscar "1234-56" OU "123456" no texto
  
  const regexComTraco = new RegExp(cboLimpo.replace(/^(\d{4})(\d{2})/, '$1-$2'));
  const regexSemTraco = new RegExp(cboLimpo);

  return regexComTraco.test(text) || regexSemTraco.test(text);
};