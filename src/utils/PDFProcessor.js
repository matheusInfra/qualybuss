import * as pdfjsLib from 'pdfjs-dist';

// --- CORREÇÃO CRÍTICA DO WORKER ---
// Alterado para usar 'unpkg' (mais confiável para versões recentes) e extensão .mjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Extrai texto de todas as páginas de um arquivo PDF
 */
export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Carrega o documento
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const pages = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Concatena o texto da página
      const pageText = textContent.items.map((item) => item.str).join(' ');
      
      // Limpeza básica
      const normalizedText = pageText.replace(/\s+/g, ' ').trim();

      pages.push({
        pageNumber: i,
        text: normalizedText
      });
    }

    return pages;
  } catch (error) {
    console.error("Erro técnico na extração do PDF:", error);
    // Lança um erro legível para o componente capturar
    throw new Error(`Falha ao processar PDF: ${error.message}`);
  }
};

/**
 * Verifica presença de CBO no texto (Auxiliar)
 */
export const checkCBOInText = (text, cboFuncionario) => {
  if (!cboFuncionario || !text) return true; 

  // Remove caracteres não numéricos do CBO do cadastro
  const cboLimpo = String(cboFuncionario).replace(/\D/g, '');
  
  if (cboLimpo.length < 4) return true;

  // Verifica formato XXXX-XX ou XXXXXX
  let match = text.includes(cboLimpo);
  
  if (!match && cboLimpo.length >= 6) {
     const formatted = cboLimpo.slice(0, 4) + '-' + cboLimpo.slice(4);
     match = text.includes(formatted);
  }

  return match;
};