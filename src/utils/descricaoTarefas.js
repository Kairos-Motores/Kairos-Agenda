// O editor de descrição (TipTap) permite criar listas de tarefas (checklist) dentro do
// próprio texto. Para que essas tarefas apareçam e sejam marcáveis direto no card, sem abrir
// a ficha, lemos e alteramos o HTML salvo em cr4a1_descricao (sem precisar de outro campo).
export const extrairTarefas = (html) => {
  if (!html || !html.includes('data-type="taskItem"')) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('li[data-type="taskItem"]')].map((li, index) => ({
    index,
    texto: (li.querySelector('div')?.textContent || li.textContent || '').trim(),
    concluida: li.getAttribute('data-checked') === 'true'
  }));
};

// O evento da agenda ligado à ficha (cr4a1_detalhes) é exibido como texto puro em vários
// lugares (EventDetailModal, ListView...), então a descrição rica precisa virar texto simples
// antes de ir pra lá — senão aparecem as tags HTML cruas.
export const htmlParaTexto = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

export const alternarTarefaNaDescricao = (html, index) => {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  const li = doc.querySelectorAll('li[data-type="taskItem"]')[index];
  if (!li) return html;
  const novoEstado = li.getAttribute('data-checked') !== 'true';
  li.setAttribute('data-checked', String(novoEstado));
  const checkbox = li.querySelector('input[type="checkbox"]');
  if (checkbox) {
    if (novoEstado) checkbox.setAttribute('checked', '');
    else checkbox.removeAttribute('checked');
  }
  return doc.body.innerHTML;
};
