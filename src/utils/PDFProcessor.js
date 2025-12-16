import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// --- CORREÇÃO DO ERRO DO WORKER ---
// Ao invés de carregar localmente (o que gera erro 403 no Vite), 
// apontamos para uma CDN confiável que entrega o arquivo correto.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Processa o PDFzão, divide por páginas e tenta identificar o funcionário.
 * @param {File} file - O arquivo PDF completo
 * @param {Array} funcionarios - Lista de funcionários do banco (para fazer o match)
 */
export const processarPDFHolerites = async (file, funcionarios) => {
  try {
    // 1. Lê o arquivo original para um Buffer
    const arrayBufferOriginal = await file.arrayBuffer();

    // 2. CRIA UMA CÓPIA (CLONE) DO BUFFER
    // Isso é vital: O PDF.js transfere o buffer para o worker e o "mata" (detach) na thread principal.
    // Precisamos de duas cópias vivas: uma para ler (PDF.js) e outra para cortar (pdf-lib).
    const bufferParaLeitura = arrayBufferOriginal.slice(0); 
    const bufferParaEdicao = arrayBufferOriginal.slice(0);

    // 3. Carrega o documento para LEITURA (Usa a cópia 1)
    const loadingTask = pdfjsLib.getDocument(bufferParaLeitura);
    const pdf = await loadingTask.promise;
    
    // 4. Carrega o documento para EDIÇÃO/CORTE (Usa a cópia 2)
    const pdfDoc = await PDFDocument.load(bufferParaEdicao);
    
    const resultados = [];

    // Loop por todas as páginas (PDF.js usa base 1)
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Junta todo o texto da página em uma string só para busca
      const textoPagina = textContent.items.map(item => item.str).join(' ');

      // --- ESTRATÉGIA DE EXTRAÇÃO ---
      let funcionarioEncontrado = null;

      // Normaliza o texto da página (remove acentos, espaços extras, tudo maiúsculo)
      const textoNormalizado = textoPagina.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');

      // Busca: Tenta achar o nome de algum funcionário dentro do texto da página
      for (const func of funcionarios) {
        if (!func.nome_completo) continue;

        // Normaliza o nome do funcionário também para garantir o match
        const nomeFuncionario = func.nome_completo.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // Verifica se o nome completo está na página
        if (textoNormalizado.includes(nomeFuncionario)) {
          funcionarioEncontrado = func;
          break; // Achou, para de procurar
        }
      }

      // Extrai a Competência (Ex: "Agosto de 2025") via Regex
      // Tenta capturar padrões como "JANEIRO/2024", "JANEIRO DE 2024" ou apenas "01/2024"
      const meses = "JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO";
      const regexCompetencia = new RegExp(`(${meses})\\s+(DE\\s+)?(\\d{4})`, 'i');
      const matchCompetencia = textoNormalizado.match(regexCompetencia);
      
      let competencia = 'Mês/Ano não identificado';
      if (matchCompetencia) {
        competencia = matchCompetencia[0];
      }

      // --- CRIAÇÃO DO PDF INDIVIDUAL ---
      // Cria um novo PDF contendo apenas a página atual
      const novoPdf = await PDFDocument.create();
      // Atenção: Indices do pdf-lib começam em 0, do pdf.js começam em 1
      const [copiedPage] = await novoPdf.copyPages(pdfDoc, [i - 1]);
      novoPdf.addPage(copiedPage);
      const pdfBytes = await novoPdf.save();
      
      // Cria o Blob para visualização e upload
      const blobIndividual = new Blob([pdfBytes], { type: 'application/pdf' });

      resultados.push({
        id_temp: `page-${i}`, // ID único temporário
        numero_pagina: i,
        funcionario: funcionarioEncontrado, // Objeto do funcionário ou null
        status: funcionarioEncontrado ? 'success' : 'warning', // Verde ou Amarelo
        competencia, // Ex: "AGOSTO DE 2025"
        arquivo: blobIndividual, // O arquivo físico pronto (Blob)
        previewUrl: URL.createObjectURL(blobIndividual) // Link para o iframe
      });
    }

    return resultados;

  } catch (error) {
    console.error("Erro crítico no processamento do PDF:", error);
    throw new Error("Falha ao ler o arquivo PDF. Verifique se ele não está corrompido ou protegido por senha.");
  }
};