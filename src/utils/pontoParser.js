// src/utils/pontoParser.js

export const parseArquivoPonto = async (file) => {
  const text = await file.text();
  const lines = text.split('\n');
  const batidas = [];
  
  // Regex simples para pegar data/hora e PIS da linha tipo 3
  // Exemplo: ...2025-11-01T08:54:00-0300...
  
  lines.forEach((line, index) => {
    if (!line || line.length < 30) return;

    // Posição 9 é o tipo (0 a 9)
    const tipo = line.substring(9, 10);

    if (tipo === '3') { // Tipo 3 = Marcação
      try {
        const nsr = line.substring(0, 9);
        // Data ISO começa no 10 e tem 24 chars (YYYY-MM-DDTHH:mm:ss...)
        const dataHora = line.substring(10, 34); 
        // PIS começa no 34 e tem 11 ou 12 dígitos
        const pis = line.substring(34, 45).trim();

        batidas.push({
          nsr,
          data_hora: dataHora,
          pis,
          linha: index + 1
        });
      } catch (e) {
        console.warn("Erro linha " + (index+1));
      }
    }
  });

  return batidas;
};