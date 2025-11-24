/**
 * Manipula a tecla Enter para focar no próximo campo em vez de enviar o form.
 * Deve ser usado no evento onKeyDown do formulário ou inputs.
 */
export const handleEnterAsTab = (e) => {
  if (e.key === 'Enter') {
    // Ignora se for um textarea (onde enter deve quebrar linha)
    if (e.target.tagName === 'TEXTAREA') return;
    
    // Ignora botões
    if (e.target.type === 'submit' || e.target.type === 'button') return;

    e.preventDefault(); // Impede o submit

    // Busca todos os elementos focáveis no formulário
    const form = e.target.form;
    if (!form) return;

    const focusable = Array.from(
      form.querySelectorAll('input, select, textarea, button')
    ).filter(el => !el.disabled && !el.hidden && el.tabIndex !== -1);

    const index = focusable.indexOf(e.target);
    
    // Se houver um próximo elemento, foca nele
    if (index > -1 && index < focusable.length - 1) {
      focusable[index + 1].focus();
    }
  }
};