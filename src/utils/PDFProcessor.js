import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// --- CONFIGURAÇÃO DO WORKER ---
// Apontamos para uma CDN confiável para evitar erros de 403/MIME type no Vite em desenvolvimento
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

/**
 * Processa o PDF de holerites, divide por páginas e identifica o funcionário.
 * ATUALIZAÇÃO: Agora usa CBO + Nome para validação mais precisa.
 * * @param {File} file - O arquivo PDF completo
 * @param {Array} funcionarios - Lista de funcionários do banco (deve conter nome_completo e cbo)
 */
export const processarPDFHolerites = async (file, funcionarios) => {
  try {
    // 1. Lê o arquivo original para um Buffer
    const arrayBufferOriginal = await file.arrayBuffer();

    // 2. CRIA DUAS CÓPIAS DO BUFFER
    // O PDF.js consome o buffer (detach) na leitura, então precisamos de outro para o PDF-Lib cortar
    const bufferParaLeitura = arrayBufferOriginal.slice(0); 
    const bufferParaEdicao = arrayBufferOriginal.slice(0);

    // 3. Carrega o documento para LEITURA DE TEXTO
    const loadingTask = pdfjsLib.getDocument(bufferParaLeitura);
    const pdf = await loadingTask.promise;
    
    // 4. Carrega o documento para EDIÇÃO/CORTE
    const pdfDoc = await PDFDocument.load(bufferParaEdicao);
    
    const resultados = [];

    // Loop por todas as páginas (Nota: PDF.js usa base 1)
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Junta todo o texto da página em uma string única para facilitar a busca
      const textoPagina = textContent.items.map(item => item.str).join(' ');

      // Normaliza o texto da página (Maiúsculas, sem acentos, espaços simples)
      const textoNormalizado = textoPagina.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');

      // --- LÓGICA DE EXTRAÇÃO E IDENTIFICAÇÃO ---
      let funcionarioEncontrado = null;
      let matchType = 'none'; // 'both', 'name_only', 'conflict', 'none'

      // A. Tenta extrair o CBO do texto do holerite
      // Procura pela palavra CBO seguida opcionalmente de : ou . e números (Ex: "CBO: 212420" ou "CBO 212420")
      const regexCBO = /CBO\s*[:.]?\s*(\d{4,6})/i;
      const matchCBO = textoNormalizado.match(regexCBO);
      const cboEncontradoPDF = matchCBO ? matchCBO[1] : null;

      // B. Busca na lista de funcionários
      for (const func of funcionarios) {
        if (!func.nome_completo) continue;

        // Normaliza nome do funcionário para bater com o PDF
        const nomeFuncionario = func.nome_completo.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const cboFuncionario = func.cbo ? func.cbo.replace(/\D/g, '') : null; // Remove pontos do banco

        // Verifica match de nome
        const nomeMatch = textoNormalizado.includes(nomeFuncionario);
        
        // Verifica match de CBO (Se CBO foi achado no PDF)
        const cboMatch = cboEncontradoPDF && cboFuncionario === cboEncontradoPDF;

        if (nomeMatch && cboMatch) {
          // OURO: Nome e CBO batem. Certeza absoluta.
          funcionarioEncontrado = func;
          matchType = 'both';
          break; 
        } else if (nomeMatch && !cboFuncionario) {
          // PRATA: Nome bate, mas funcionário não tem CBO cadastrado para validar.
          funcionarioEncontrado = func;
          matchType = 'name_only';
        } else if (nomeMatch && cboFuncionario && !cboMatch) {
          // CONFLITO: Nome bate, mas CBO é diferente. Pode ser homônimo ou promoção não atualizada.
          funcionarioEncontrado = func;
          matchType = 'conflict';
        }
      }

      // C. Extrai a Competência (Mês/Ano)
      const meses = "JANEIRO|FEVEREIRO|MARÇO|ABRIL|MAIO|JUNHO|JULHO|AGOSTO|SETEMBRO|OUTUBRO|NOVEMBRO|DEZEMBRO";
      const regexCompetencia = new RegExp(`(${meses})\\s+(DE\\s+)?(\\d{4})`, 'i');
      const matchCompetencia = textoNormalizado.match(regexCompetencia);
      const competencia = matchCompetencia ? matchCompetencia[0] : 'Mês/Ano não identificado';

      // --- CRIAÇÃO DO PDF INDIVIDUAL ---
      const novoPdf = await PDFDocument.create();
      // PDF-Lib usa base 0, PDF.js usa base 1
      const [copiedPage] = await novoPdf.copyPages(pdfDoc, [i - 1]);
      novoPdf.addPage(copiedPage);
      const pdfBytes = await novoPdf.save();
      const blobIndividual = new Blob([pdfBytes], { type: 'application/pdf' });

      // Definição de Status para a Interface
      let status = 'warning'; // Padrão amarelo
      let obs = '';

      if (matchType === 'both') {
        status = 'success'; // Verde
      } else if (matchType === 'name_only') {
        status = 'success'; // Aceita, mas ideal cadastrar CBO
        obs = 'Validado por nome (CBO não cadastrado).';
      } else if (matchType === 'conflict') {
        status = 'warning';
        obs = `Atenção: CBO do PDF (${cboEncontradoPDF}) difere do cadastro.`;
      } else {
        status = 'error'; // Não encontrou ninguém
      }

      resultados.push({
        id_temp: `page-${i}`,
        numero_pagina: i,
        funcionario: funcionarioEncontrado,
        status: funcionarioEncontrado ? status : 'error',
        observacao: obs,
        competencia,
        cboPdf: cboEncontradoPDF,
        arquivo: blobIndividual,
        previewUrl: URL.createObjectURL(blobIndividual)
      });
    }

    return resultados;

  } catch (error) {
    console.error("Erro crítico no processamento do PDF:", error);
    throw new Error("Falha ao ler o arquivo PDF. Verifique se ele não está corrompido ou protegido por senha.");
  }
};