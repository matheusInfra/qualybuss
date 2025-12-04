/**
 * Converte arquivo CSV para Array de Objetos JSON
 */
export const parseCSV = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return reject(new Error("Arquivo CSV vazio ou inválido."));

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const result = [];

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].split(','); // Nota: Isso falha se houver vírgula dentro do valor. Para produção robusta, usar lib 'papaparse'.
        
        if (currentLine.length === headers.length) {
          const obj = {};
          headers.forEach((header, index) => {
            let value = currentLine[index]?.trim().replace(/"/g, '');
            // Mapeamento de nomes comuns para o padrão do banco
            if (header.toLowerCase().includes('nome')) header = 'nome_completo';
            if (header.toLowerCase().includes('mail')) header = 'email_corporativo';
            if (header.toLowerCase().includes('admiss')) header = 'data_admissao';
            if (header.toLowerCase().includes('sal')) header = 'salario_bruto';
            
            obj[header] = value;
          });
          result.push(obj);
        }
      }
      resolve(result);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
};

/**
 * Gera um arquivo JSON para download (Backup da IA)
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