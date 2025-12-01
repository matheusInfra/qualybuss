// src/utils/PDFProcessor.js
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Configura o worker do PDF.js (Necessário para Vite/React)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Processa o PDFzão, divide por páginas e tenta identificar o funcionário.
 * @param {File} file - O arquivo PDF completo
 * @param {Array} funcionarios - Lista de funcionários do banco (para fazer o match)
 */
export const processarPDFHolerites = async (file, funcionarios) => {
  const arrayBuffer = await file.arrayBuffer();
  
  // 1. Carrega o documento para leitura de texto
  const loadingTask = pdfjsLib.getDocument(arrayBuffer);
  const pdf = await loadingTask.promise;
  
  // 2. Carrega o documento para edição/split (separar as páginas)
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const resultados = [];

  // Loop por todas as páginas
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const textoPagina = textContent.items.map(item => item.str).join(' ');

    // --- ESTRATÉGIA DE EXTRAÇÃO (Adaptada para Onvio) ---
    // Procuramos o nome do funcionário. 
    // No seu modelo, o nome aparece solto, geralmente em caixa alta.
    // Vamos varrer a lista de funcionários ativos e ver se o nome deles está nesta página.
    
    let funcionarioEncontrado = null;
    let grauCerteza = 'none'; // 'exact', 'partial', 'none'

    // Normaliza o texto da página para evitar problemas com espaços extras/caixa
    const textoNormalizado = textoPagina.toUpperCase().replace(/\s+/g, ' ');

    // Busca: Tenta achar o nome de algum funcionário dentro do texto da página
    for (const func of funcionarios) {
      const nomeFuncionario = func.nome_completo.toUpperCase();
      
      if (textoNormalizado.includes(nomeFuncionario)) {
        funcionarioEncontrado = func;
        grauCerteza = 'exact';
        break; // Achou exato, para de procurar
      }
    }

    // Extrai a Competência (Ex: "Agosto de 2025")
    // Regex simples para tentar achar Mês/Ano
    const matchCompetencia = textoNormalizado.match(/(JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO)\s+DE\s+(\d{4})/);
    const competencia = matchCompetencia ? matchCompetencia[0] : 'Desconhecida';

    // --- CRIAÇÃO DO PDF INDIVIDUAL ---
    // Copia apenas esta página para um novo PDF
    const novoPdf = await PDFDocument.create();
    const [copiedPage] = await novoPdf.copyPages(pdfDoc, [i - 1]);
    novoPdf.addPage(copiedPage);
    const pdfBytes = await novoPdf.save();
    const blobIndividual = new Blob([pdfBytes], { type: 'application/pdf' });

    resultados.push({
      id_temp: `page-${i}`, // ID temporário para a lista
      numero_pagina: i,
      funcionario: funcionarioEncontrado, // Pode ser null se não achou
      status: funcionarioEncontrado ? 'success' : 'warning', // Verde ou Amarelo
      competencia,
      arquivo: blobIndividual, // O arquivo pronto para upload
      previewUrl: URL.createObjectURL(blobIndividual) // Para mostrar na tela
    });
  }

  return resultados;
};