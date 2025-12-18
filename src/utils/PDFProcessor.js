import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker (Essencial para não travar a UI)
// Usa CDN para evitar problemas de configuração de build complexa no Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extrai texto de todas as páginas de um arquivo PDF
 */
export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const pages = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Junta as strings da página com espaçamento seguro
      const pageText = textContent.items.map((item) => item.str).join(' ');
      
      // Remove espaços excessivos para facilitar a busca
      const normalizedText = pageText.replace(/\s+/g, ' ').trim();

      pages.push({
        pageNumber: i,
        text: normalizedText
      });
    }

    return pages;
  } catch (error) {
    console.error("Erro na extração do PDF:", error);
    throw new Error("Não foi possível ler o PDF.");
  }
};

/**
 * Verifica se o CBO do funcionário está presente no texto da página
 */
export const checkCBOInText = (text, cboFuncionario) => {
  if (!cboFuncionario || !text) return true; // Se não tem CBO pra validar, passa (fallback)

  // Limpa o CBO do cadastro (deixa só números)
  const cboLimpo = String(cboFuncionario).replace(/\D/g, '');
  
  // Se o CBO for muito curto, ignora validação para evitar falso positivo
  if (cboLimpo.length < 4) return true;

  // Cria padrão para buscar com traço (1234-56) ou sem traço (123456)
  // O regex busca a sequência no meio do texto
  
  // Tenta formatar XXXX-XX
  let regexPattern = cboLimpo;
  if (cboLimpo.length >= 6) {
     const formatted = cboLimpo.slice(0, 4) + '-' + cboLimpo.slice(4);
     // Busca o número puro OU o número formatado
     return text.includes(cboLimpo) || text.includes(formatted);
  }

  return text.includes(cboLimpo);
};